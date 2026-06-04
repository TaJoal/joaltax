import type {
  CalculationLine,
  Deductions,
  FamilyMember,
  MonthlyCardSpending,
  MonthlySalary,
  Bonus,
  TaxCalculationResult,
  TaxRules,
} from '@/types';
import { computeCardDeduction } from './deductionService';
import {
  MEDICAL_CATEGORIES,
  EDUCATION_CATEGORIES,
  findCategory,
} from '@/components/deduction/expenseCategories';
import { getAge } from '@/utils/age';

const NON_TAXABLE_MEAL_MONTHLY = 200000;
/** 지방소득세는 소득세 결정세액의 10%. 사용자가 명세서·홈택스에서 보는 환급/추납은 둘을 합산한 값. */
const LOCAL_SURTAX_RATE = 0.1;
/** 일반의료비(부양가족) 연 700만원 한도. 본인·65+·장애인·난임·미숙아는 한도 없음. */
const GENERAL_MEDICAL_CAP = 7_000_000;
/** 부녀자공제 적용 종합소득금액 한도 (3천만원). 근로소득금액으로 근사. */
const FEMALE_WORKER_INCOME_LIMIT = 30_000_000;

function clampNonTaxable(monthlyNonTaxable: number): number {
  return Math.min(monthlyNonTaxable, NON_TAXABLE_MEAL_MONTHLY);
}

function evalEarnedIncomeDeduction(income: number, rules: TaxRules): number {
  for (const tier of rules.earnedIncomeDeduction) {
    if (tier.max === null || income <= tier.max) {
      const formula = tier.formula.replace(/income/g, String(income));
      try {
        // eslint-disable-next-line no-new-func
        const v = Function(`return (${formula});`)();
        return Math.max(0, Number(v) || 0);
      } catch {
        return 0;
      }
    }
  }
  return 0;
}

function pickBracket(taxBase: number, rules: TaxRules) {
  for (const b of rules.taxBrackets) {
    if (b.max === null || taxBase <= b.max) return b;
  }
  return rules.taxBrackets[rules.taxBrackets.length - 1];
}

/** 근로소득세액공제 한도 — 총급여별 차등 (74/66/50/20만). */
function earnedIncomeCreditLimit(totalSalary: number, rules: TaxRules): number {
  const brackets = rules.taxCredits.earnedIncome.limitBrackets;
  for (const b of brackets) {
    if (b.salaryMax === null || totalSalary <= b.salaryMax) {
      return Math.max(b.floor, b.base - (totalSalary - b.from) * b.taper);
    }
  }
  return brackets[brackets.length - 1].floor;
}

function computeEarnedIncomeCredit(calculatedTax: number, totalSalary: number, rules: TaxRules): number {
  const ei = rules.taxCredits.earnedIncome;
  const raw =
    calculatedTax <= ei.tier1.max
      ? calculatedTax * ei.tier1.rate
      : ei.tier1.max * ei.tier1.rate + (calculatedTax - ei.tier1.max) * ei.tier2.rate;
  return Math.min(earnedIncomeCreditLimit(totalSalary, rules), raw);
}

/** 자녀세액공제 — 기준연도 기준 만 8세 이상 자녀만 (생년 미입력 시 카운트). */
function computeChildCredit(family: FamilyMember[], rules: TaxRules): number {
  const children = family.filter((f) => {
    if (f.relation !== 'child') return false;
    const age = getAge(f.birthYear, rules.year);
    return age == null || age >= 8;
  });
  const n = children.length;
  if (n === 0) return 0;
  if (n === 1) return rules.taxCredits.child['1'];
  if (n === 2) return rules.taxCredits.child['2'];
  const more = rules.taxCredits.child['3+'];
  return more.base + more.perChild * (n - 2);
}

function computePensionAccountCredit(deductions: Deductions, totalSalary: number, rules: TaxRules): {
  amount: number;
  appliedSavings: number;
  appliedIrp: number;
  effectiveRate: number;
} {
  const cfg = rules.taxCredits.pensionAccount;
  const rate = totalSalary <= cfg.salaryThreshold ? cfg.rateLow : cfg.rateHigh;
  const savings = Math.min(deductions.pensionSaving, cfg.limits.pensionSaving);
  const remaining = Math.max(0, cfg.limits.total - savings);
  const irp = Math.min(deductions.irp, remaining);
  const amount = (savings + irp) * rate;
  return { amount, appliedSavings: savings, appliedIrp: irp, effectiveRate: rate };
}

/**
 * 의료비 세액공제 — 항목별 차등 공제율 + 일반의료비 700만 한도.
 * 최저사용금액(총급여 3%)은 낮은 공제율(일반) 항목부터 차감 (납세자에게 유리 + 실제 차감 순서와 유사).
 * medicalItems가 없으면 스칼라 medical을 일반의료비(700만 cap, 15%)로 근사.
 */
function computeMedicalCredit(deductions: Deductions, totalSalary: number, rules: TaxRules): number {
  const threshold = totalSalary * rules.taxCredits.medical.thresholdRate;
  const items = deductions.medicalItems;

  // 공제율 오름차순 버킷 (threshold를 낮은 율부터 차감)
  let buckets: Array<{ spend: number; rate: number }>;
  if (items && items.length > 0) {
    let general = 0;
    let self = 0; // 본인·65+·장애인 (15%, 한도없음)
    let premature = 0; // 20%
    let infertility = 0; // 30%
    for (const it of items) {
      const cat = findCategory(MEDICAL_CATEGORIES, it.category);
      const amt = cat.limit ? Math.min(it.amount, cat.limit) : it.amount;
      if (!cat.special) general += amt;
      else if (cat.rate >= 0.3) infertility += amt;
      else if (cat.rate >= 0.2) premature += amt;
      else self += amt;
    }
    general = Math.min(general, GENERAL_MEDICAL_CAP);
    buckets = [
      { spend: general, rate: 0.15 },
      { spend: self, rate: 0.15 },
      { spend: premature, rate: 0.2 },
      { spend: infertility, rate: 0.3 },
    ];
  } else {
    buckets = [{ spend: Math.min(deductions.medical, GENERAL_MEDICAL_CAP), rate: 0.15 }];
  }

  let remainingThreshold = threshold;
  let credit = 0;
  for (const b of buckets) {
    const reduce = Math.min(remainingThreshold, b.spend);
    remainingThreshold -= reduce;
    credit += (b.spend - reduce) * b.rate;
  }
  return credit;
}

/**
 * 교육비 세액공제 — 항목 카테고리별 한도 적용 후 15%.
 * 항목이 인별 구분을 갖지 않아 한도는 항목 단위로 근사 적용 (1인 한도 근사).
 * educationItems가 없으면 스칼라 education을 한도 없이 15% 근사.
 */
function computeEducationCredit(deductions: Deductions): number {
  const items = deductions.educationItems;
  if (items && items.length > 0) {
    const total = items.reduce((s, it) => {
      const cat = findCategory(EDUCATION_CATEGORIES, it.category);
      return s + (cat.limit ? Math.min(it.amount, cat.limit) : it.amount);
    }, 0);
    return total * 0.15;
  }
  return deductions.education * 0.15;
}

/** 일반기부금 세액공제 (특별세액공제 — 표준세액공제 선택 시 배제 대상). */
function computeGeneralDonationCredit(deductions: Deductions, rules: TaxRules): number {
  const cfg = rules.taxCredits.donation.general;
  const g = deductions.donationGeneral;
  if (g <= cfg.threshold) return g * cfg.underLimit;
  return cfg.threshold * cfg.underLimit + (g - cfg.threshold) * cfg.overLimit;
}

/**
 * 고향사랑·정치자금 기부 세액공제 (조특법 — 표준세액공제와 무관하게 적용).
 * 10만원 이하는 100/110 (소득세 기준) → 지방세 합산 시 100% 공제.
 */
function computeOtherDonationCredit(deductions: Deductions, rules: TaxRules): number {
  const cfg = rules.taxCredits.donation;
  let credit = 0;

  // 고향사랑기부
  const h = Math.min(deductions.donationHometown, cfg.hometown.limit);
  credit += Math.min(h, 100000) * cfg.hometown.under100k;
  credit += Math.max(0, h - 100000) * cfg.hometown.over100k;

  // 정치자금기부
  const p = deductions.donationPolitical;
  const pol = cfg.political;
  credit += Math.min(p, pol.tier1Max) * pol.tier1Rate;
  credit += Math.min(Math.max(0, p - pol.tier1Max), pol.midMax - pol.tier1Max) * pol.midRate;
  credit += Math.max(0, p - pol.midMax) * pol.highRate;

  return credit;
}

function computeInsuranceCredit(deductions: Deductions): number {
  return Math.min(deductions.insurance, 1000000) * 0.12;
}

function computeMonthlyRentCredit(deductions: Deductions, totalSalary: number, rules: TaxRules): number {
  if (totalSalary > 80000000) return 0;
  const cfg = rules.taxCredits.monthlyRent;
  const rate = totalSalary <= cfg.salaryThreshold ? cfg.rateLow : cfg.rateHigh;
  return Math.min(deductions.monthlyRent, cfg.limit) * rate;
}

function computeHousingSavingDeduction(deductions: Deductions, totalSalary: number): number {
  if (totalSalary > 70000000) return 0;
  return Math.min(deductions.housingSaving, 3000000) * 0.4;
}

function computePersonalDeduction(
  family: FamilyMember[],
  rules: TaxRules,
  deductions: Deductions,
  earnedIncomeAmount: number,
): {
  amount: number;
  basicCount: number;
  elderly: number;
  disabled: number;
  femaleWorker: number;
} {
  const basicCount = 1 + family.filter((f) => !f.hasIncome).length;
  const elderlyCount = family.filter((f) => f.isElderly).length;
  const disabledCount = family.filter((f) => f.isDisabled).length;
  const basic = basicCount * rules.personalDeduction.basic;
  const elderly = elderlyCount * rules.personalDeduction.elderly;
  const disabled = disabledCount * rules.personalDeduction.disabled;
  const single = deductions.isSingleParent ? rules.personalDeduction.singleParent : 0;
  // 부녀자공제: 한부모공제와 중복 불가 (한부모 우선), 종합소득 3천만 이하만
  const female =
    deductions.isFemaleWorker && !deductions.isSingleParent && earnedIncomeAmount <= FEMALE_WORKER_INCOME_LIMIT
      ? rules.personalDeduction.femaleWorker
      : 0;
  return {
    amount: basic + elderly + disabled + single + female,
    basicCount,
    elderly,
    disabled,
    femaleWorker: female,
  };
}

export interface TaxCalculatorInput {
  salaries: MonthlySalary[];
  bonuses: Bonus[];
  cards: MonthlyCardSpending[];
  deductions: Deductions;
  family: FamilyMember[];
  rules: TaxRules;
}

export function calculate(input: TaxCalculatorInput): TaxCalculationResult {
  const { salaries, bonuses, cards, deductions, family, rules } = input;

  const totalGross = salaries.reduce((s, m) => s + m.grossPay, 0)
    + bonuses.reduce((s, b) => s + b.amount, 0);
  const totalNonTaxable = salaries.reduce(
    (s, m) => s + clampNonTaxable(m.nationalPension > 0 || m.grossPay > 0 ? m.nonTaxable : 0),
    0,
  );

  const taxableIncome = Math.max(0, totalGross - totalNonTaxable);

  const earnedIncomeDeduction = evalEarnedIncomeDeduction(taxableIncome, rules);
  const earnedIncomeAmount = Math.max(0, taxableIncome - earnedIncomeDeduction);

  const personal = computePersonalDeduction(family, rules, deductions, earnedIncomeAmount);

  // 4대보험: 국민연금(연금보험료공제, 항상 적용) + 건강/고용/장기요양(특별소득공제, 표준세액공제 선택 시 배제)
  const pensionInsurance = salaries.reduce((s, m) => s + m.nationalPension, 0);
  const specialInsurance = salaries.reduce(
    (s, m) => s + m.healthInsurance + m.longTermCare + m.employmentInsurance,
    0,
  );
  const insuranceDeductionAll = pensionInsurance + specialInsurance;

  const cardBreakdown = computeCardDeduction(taxableIncome, cards, rules);
  const housingSavingDeduction = computeHousingSavingDeduction(deductions, taxableIncome);

  // 그밖의소득공제 (두 시나리오 공통)
  const baseIncomeDeduction =
    personal.amount + pensionInsurance + cardBreakdown.totalDeduction + housingSavingDeduction;

  // 세액공제 — 분류
  const childCredit = computeChildCredit(family, rules);
  const pension = computePensionAccountCredit(deductions, taxableIncome, rules);
  const otherDonationCredit = computeOtherDonationCredit(deductions, rules); // 고향사랑·정치 (항상)
  // 특별세액공제 (표준세액공제 선택 시 배제)
  const medicalCreditFull = computeMedicalCredit(deductions, taxableIncome, rules);
  const educationCreditFull = computeEducationCredit(deductions);
  const generalDonationCreditFull = computeGeneralDonationCredit(deductions, rules);
  const insuranceCreditFull = computeInsuranceCredit(deductions);
  const monthlyRentCreditFull = computeMonthlyRentCredit(deductions, taxableIncome, rules);

  // 한 시나리오의 결정세액(소득세)·구성요소 계산
  const evalRoute = (includeSpecialInsurance: boolean, useStandard: boolean) => {
    const incomeDeduction = baseIncomeDeduction + (includeSpecialInsurance ? specialInsurance : 0);
    const taxBase = Math.max(0, earnedIncomeAmount - incomeDeduction);
    const bracket = pickBracket(taxBase, rules);
    const calculatedTax = Math.max(0, taxBase * bracket.rate - bracket.deduction);
    const earnedCredit = computeEarnedIncomeCredit(calculatedTax, taxableIncome, rules);

    const standardCredit = useStandard ? rules.taxCredits.standardCredit : 0;
    const medical = useStandard ? 0 : medicalCreditFull;
    const education = useStandard ? 0 : educationCreditFull;
    const generalDonation = useStandard ? 0 : generalDonationCreditFull;
    const insurance = useStandard ? 0 : insuranceCreditFull;
    const monthlyRent = useStandard ? 0 : monthlyRentCreditFull;

    const donationCredit = generalDonation + otherDonationCredit;
    const totalTaxCredits =
      earnedCredit + childCredit + pension.amount + medical + education + donationCredit + insurance + monthlyRent + standardCredit;
    const determinedTaxIncome = Math.max(0, calculatedTax - totalTaxCredits);

    return {
      includeSpecialInsurance,
      incomeDeduction,
      taxBase,
      bracket,
      calculatedTax,
      earnedCredit,
      standardCredit,
      medical,
      education,
      donationCredit,
      insurance,
      monthlyRent,
      totalTaxCredits,
      determinedTaxIncome,
    };
  };

  // 표준세액공제(특별공제 배제) vs 특별공제 — 결정세액이 낮은 쪽 선택
  const routeSpecial = evalRoute(true, false);
  const routeStandard = evalRoute(false, true);
  const chosen =
    routeStandard.determinedTaxIncome < routeSpecial.determinedTaxIncome ? routeStandard : routeSpecial;

  const totalIncomeDeduction = chosen.incomeDeduction;
  const taxBase = chosen.taxBase;
  const bracket = chosen.bracket;
  const calculatedTax = chosen.calculatedTax;
  // 표시용 4대보험 공제 — 표준세액공제 선택 시 특별소득공제(건강/고용/장기요양) 배제
  const insuranceDeduction = chosen.includeSpecialInsurance ? insuranceDeductionAll : pensionInsurance;

  // 소득공제 절세효과 (지방세 포함) — 소득공제가 전혀 없었을 때 대비
  const taxBaseIfNoIncomeDeduction = earnedIncomeAmount;
  const grossBracket = pickBracket(taxBaseIfNoIncomeDeduction, rules);
  const grossTaxIfNoDeductionsIncome = Math.max(
    0,
    taxBaseIfNoIncomeDeduction * grossBracket.rate - grossBracket.deduction,
  );
  const grossTaxIfNoDeductions = Math.round(grossTaxIfNoDeductionsIncome * (1 + LOCAL_SURTAX_RATE));
  const incomeDeductionSaving = Math.round(
    Math.max(0, grossTaxIfNoDeductionsIncome - calculatedTax) * (1 + LOCAL_SURTAX_RATE),
  );

  const earnedIncomeCredit = chosen.earnedCredit;
  const totalTaxCredits = chosen.totalTaxCredits;

  const taxCreditSaving = Math.round(Math.min(totalTaxCredits, calculatedTax) * (1 + LOCAL_SURTAX_RATE));
  const determinedTaxIncome = chosen.determinedTaxIncome;
  const localTaxOnDetermined = Math.round(determinedTaxIncome * LOCAL_SURTAX_RATE);
  const determinedTax = determinedTaxIncome + localTaxOnDetermined;
  const totalSaving = incomeDeductionSaving + taxCreditSaving;

  const prepaidTax = salaries.reduce((s, m) => s + m.incomeTax + m.localIncomeTax, 0);
  const refund = prepaidTax - determinedTax;

  const personalLabel = `인적공제 (본인 + ${personal.basicCount - 1}명${
    deductions.isSingleParent ? ', 한부모' : personal.femaleWorker > 0 ? ', 부녀자' : ''
  })`;

  const creditLines: CalculationLine[] = chosen.standardCredit > 0
    ? [
        { label: '근로소득 세액공제', amount: -earnedIncomeCredit, kind: 'credit' },
        { label: '자녀 세액공제', amount: -childCredit, kind: 'credit' },
        { label: `연금계좌 세액공제 (적용율 ${(pension.effectiveRate * 100).toFixed(0)}%)`, amount: -pension.amount, kind: 'credit' },
        { label: '고향사랑·정치자금 기부', amount: -otherDonationCredit, kind: 'credit' },
        { label: '표준세액공제', amount: -chosen.standardCredit, kind: 'credit', note: '특별공제보다 유리하여 적용' },
      ]
    : [
        { label: '근로소득 세액공제', amount: -earnedIncomeCredit, kind: 'credit' },
        { label: '자녀 세액공제', amount: -childCredit, kind: 'credit' },
        { label: `연금계좌 세액공제 (적용율 ${(pension.effectiveRate * 100).toFixed(0)}%)`, amount: -pension.amount, kind: 'credit' },
        { label: '의료비 세액공제', amount: -chosen.medical, kind: 'credit' },
        { label: '교육비 세액공제', amount: -chosen.education, kind: 'credit' },
        { label: '기부금 세액공제', amount: -chosen.donationCredit, kind: 'credit' },
        { label: '보장성보험료 세액공제', amount: -chosen.insurance, kind: 'credit' },
        { label: '월세 세액공제', amount: -chosen.monthlyRent, kind: 'credit' },
      ];

  const lines: CalculationLine[] = [
    { label: '총급여 (상여 포함)', amount: totalGross, kind: 'income' },
    { label: '비과세 (식대 등)', amount: -totalNonTaxable, kind: 'deduction', note: '월 20만원 한도' },
    { label: '과세대상 총급여', amount: taxableIncome, kind: 'subtotal' },
    { label: '근로소득공제', amount: -earnedIncomeDeduction, kind: 'deduction' },
    { label: '근로소득금액', amount: earnedIncomeAmount, kind: 'subtotal' },
    { label: personalLabel, amount: -personal.amount, kind: 'deduction' },
    {
      label: chosen.includeSpecialInsurance ? '4대보험 공제' : '국민연금 공제',
      amount: -insuranceDeduction,
      kind: 'deduction',
      note: chosen.includeSpecialInsurance ? undefined : '표준세액공제 적용 — 건강·고용보험 등 특별소득공제 제외',
    },
    { label: '신용카드 등 사용공제', amount: -cardBreakdown.totalDeduction, kind: 'deduction', note: `한도 ${cardBreakdown.appliedLimit.toLocaleString()}원` },
    { label: '주택청약 공제', amount: -housingSavingDeduction, kind: 'deduction' },
    { label: '과세표준', amount: taxBase, kind: 'subtotal' },
    { label: `세율 ${(bracket.rate * 100).toFixed(0)}% 적용`, amount: calculatedTax, kind: 'tax', note: `누진공제 ${bracket.deduction.toLocaleString()}원` },
    ...creditLines,
    { label: '결정세액 (소득세)', amount: determinedTaxIncome, kind: 'tax' },
    { label: '지방소득세 (소득세 × 10%)', amount: localTaxOnDetermined, kind: 'tax' },
    { label: '결정세액 합계 (지방세 포함)', amount: determinedTax, kind: 'subtotal' },
    { label: '기납부 (소득세 + 지방세)', amount: -prepaidTax, kind: 'deduction' },
    { label: refund >= 0 ? '예상 환급액' : '추가 납부액', amount: Math.abs(refund), kind: 'result' },
  ];

  return {
    totalGrossPay: totalGross,
    totalNonTaxable,
    totalTaxableIncome: taxableIncome,
    earnedIncomeDeduction,
    earnedIncomeAmount,
    personalDeduction: personal.amount,
    insuranceDeduction,
    creditCardDeduction: cardBreakdown.totalDeduction,
    housingSavingDeduction,
    totalIncomeDeduction,
    taxBase,
    appliedRate: bracket.rate,
    calculatedTax,
    earnedIncomeCredit,
    childCredit,
    pensionAccountCredit: pension.amount,
    medicalCredit: chosen.medical,
    educationCredit: chosen.education,
    donationCredit: chosen.donationCredit,
    insuranceCredit: chosen.insurance,
    monthlyRentCredit: chosen.monthlyRent,
    standardCredit: chosen.standardCredit,
    totalTaxCredits,
    determinedTaxIncome,
    localTaxOnDetermined,
    determinedTax,
    prepaidTax,
    refund,
    lines,
    grossTaxIfNoDeductions,
    incomeDeductionSaving,
    taxCreditSaving,
    totalSaving,
  };
}
