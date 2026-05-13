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

const NON_TAXABLE_MEAL_MONTHLY = 200000;

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

function computeEarnedIncomeCredit(calculatedTax: number, rules: TaxRules): number {
  const t1 = rules.taxCredits.earnedIncome.tier1;
  const t2 = rules.taxCredits.earnedIncome.tier2;
  if (calculatedTax <= 1300000) return Math.min(t1.max, calculatedTax * t1.rate);
  return Math.min(740000, 715000 + (calculatedTax - 1300000) * t2.rate);
}

function computeChildCredit(family: FamilyMember[], rules: TaxRules): number {
  const children = family.filter((f) => f.relation === 'child');
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

function computeMedicalCredit(deductions: Deductions, totalSalary: number, rules: TaxRules): number {
  const cfg = rules.taxCredits.medical;
  const threshold = totalSalary * cfg.thresholdRate;
  const excess = Math.max(0, deductions.medical - threshold);
  return excess * cfg.rate;
}

function computeEducationCredit(deductions: Deductions): number {
  return deductions.education * 0.15;
}

function computeDonationCredit(deductions: Deductions, rules: TaxRules): number {
  const general = deductions.donationGeneral + deductions.donationHometown;
  const cfg = rules.taxCredits.donation.general;
  if (general <= cfg.threshold) return general * cfg.underLimit;
  return cfg.threshold * cfg.underLimit + (general - cfg.threshold) * cfg.overLimit;
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

function computePersonalDeduction(family: FamilyMember[], rules: TaxRules, isSingleParent: boolean): {
  amount: number;
  basicCount: number;
  elderly: number;
  disabled: number;
} {
  const basicCount = 1 + family.filter((f) => !f.hasIncome).length;
  const elderlyCount = family.filter((f) => f.isElderly).length;
  const disabledCount = family.filter((f) => f.isDisabled).length;
  const basic = basicCount * rules.personalDeduction.basic;
  const elderly = elderlyCount * rules.personalDeduction.elderly;
  const disabled = disabledCount * rules.personalDeduction.disabled;
  const single = isSingleParent ? rules.personalDeduction.singleParent : 0;
  return {
    amount: basic + elderly + disabled + single,
    basicCount,
    elderly,
    disabled,
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

  const personal = computePersonalDeduction(family, rules, deductions.isSingleParent);

  const insuranceDeduction = salaries.reduce(
    (s, m) => s + m.nationalPension + m.healthInsurance + m.longTermCare + m.employmentInsurance,
    0,
  );

  const cardBreakdown = computeCardDeduction(taxableIncome, cards, rules);
  const housingSavingDeduction = computeHousingSavingDeduction(deductions, taxableIncome);

  const totalIncomeDeduction =
    personal.amount + insuranceDeduction + cardBreakdown.totalDeduction + housingSavingDeduction;

  const taxBase = Math.max(0, earnedIncomeAmount - totalIncomeDeduction);
  const bracket = pickBracket(taxBase, rules);
  const calculatedTax = Math.max(0, taxBase * bracket.rate - bracket.deduction);

  const taxBaseIfNoIncomeDeduction = earnedIncomeAmount;
  const grossBracket = pickBracket(taxBaseIfNoIncomeDeduction, rules);
  const grossTaxIfNoDeductions = Math.max(
    0,
    taxBaseIfNoIncomeDeduction * grossBracket.rate - grossBracket.deduction,
  );
  const incomeDeductionSaving = Math.max(0, grossTaxIfNoDeductions - calculatedTax);

  const earnedIncomeCredit = computeEarnedIncomeCredit(calculatedTax, rules);
  const childCredit = computeChildCredit(family, rules);
  const pension = computePensionAccountCredit(deductions, taxableIncome, rules);
  const medicalCredit = computeMedicalCredit(deductions, taxableIncome, rules);
  const educationCredit = computeEducationCredit(deductions);
  const donationCredit = computeDonationCredit(deductions, rules);
  const insuranceCredit = computeInsuranceCredit(deductions);
  const monthlyRentCredit = computeMonthlyRentCredit(deductions, taxableIncome, rules);

  const totalTaxCredits =
    earnedIncomeCredit
    + childCredit
    + pension.amount
    + medicalCredit
    + educationCredit
    + donationCredit
    + insuranceCredit
    + monthlyRentCredit;

  const taxCreditSaving = Math.min(totalTaxCredits, calculatedTax);
  const determinedTax = Math.max(0, calculatedTax - totalTaxCredits);
  const totalSaving = incomeDeductionSaving + taxCreditSaving;

  const prepaidTax = salaries.reduce((s, m) => s + m.incomeTax, 0);

  const refund = prepaidTax - determinedTax;

  const lines: CalculationLine[] = [
    { label: '총급여 (상여 포함)', amount: totalGross, kind: 'income' },
    { label: '비과세 (식대 등)', amount: -totalNonTaxable, kind: 'deduction', note: '월 20만원 한도' },
    { label: '과세대상 총급여', amount: taxableIncome, kind: 'subtotal' },
    { label: '근로소득공제', amount: -earnedIncomeDeduction, kind: 'deduction' },
    { label: '근로소득금액', amount: earnedIncomeAmount, kind: 'subtotal' },
    { label: `인적공제 (본인 + ${personal.basicCount - 1}명${deductions.isSingleParent ? ', 한부모' : ''})`, amount: -personal.amount, kind: 'deduction' },
    { label: '4대보험 공제', amount: -insuranceDeduction, kind: 'deduction' },
    { label: '신용카드 등 사용공제', amount: -cardBreakdown.totalDeduction, kind: 'deduction', note: `한도 ${cardBreakdown.appliedLimit.toLocaleString()}원` },
    { label: '주택청약 공제', amount: -housingSavingDeduction, kind: 'deduction' },
    { label: '과세표준', amount: taxBase, kind: 'subtotal' },
    { label: `세율 ${(bracket.rate * 100).toFixed(0)}% 적용`, amount: calculatedTax, kind: 'tax', note: `누진공제 ${bracket.deduction.toLocaleString()}원` },
    { label: '근로소득 세액공제', amount: -earnedIncomeCredit, kind: 'credit' },
    { label: '자녀 세액공제', amount: -childCredit, kind: 'credit' },
    { label: `연금계좌 세액공제 (적용율 ${(pension.effectiveRate * 100).toFixed(0)}%)`, amount: -pension.amount, kind: 'credit' },
    { label: '의료비 세액공제', amount: -medicalCredit, kind: 'credit' },
    { label: '교육비 세액공제', amount: -educationCredit, kind: 'credit' },
    { label: '기부금 세액공제', amount: -donationCredit, kind: 'credit' },
    { label: '보장성보험료 세액공제', amount: -insuranceCredit, kind: 'credit' },
    { label: '월세 세액공제', amount: -monthlyRentCredit, kind: 'credit' },
    { label: '결정세액', amount: determinedTax, kind: 'subtotal' },
    { label: '기납부 소득세', amount: -prepaidTax, kind: 'deduction' },
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
    medicalCredit,
    educationCredit,
    donationCredit,
    insuranceCredit,
    monthlyRentCredit,
    totalTaxCredits,
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
