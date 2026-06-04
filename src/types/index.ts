export interface Profile {
  key: string;
  name: string;
  /** 4-digit birth year (optional). Used for age-based recommendations (e.g. 청년 정책). */
  birthYear?: number;
  createdAt: string;
  lastAccessAt: string;
}

export type AgeBracket = 'youth' | 'middle' | 'senior';

export interface MonthlySalary {
  month: number;
  grossPay: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localIncomeTax: number;
  nonTaxable: number;
}

export type BonusType = 'regular' | 'performance' | 'holiday' | 'etc';

export interface Bonus {
  id: string;
  month: number;
  amount: number;
  type: BonusType;
  memo?: string;
}

export interface MonthlyCardSpending {
  month: number;
  creditCard: number;
  checkCard: number;
  cashReceipt: number;
  traditionalMarket: number;
  publicTransport: number;
  books: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  birthYear?: number;
  isElderly: boolean;
  isDisabled: boolean;
  hasIncome: boolean;
}

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  memo?: string;
}

export interface Deductions {
  medical: number;
  /** Itemized medical expenses; when present, `medical` is derived from sum */
  medicalItems?: ExpenseItem[];
  education: number;
  /** Itemized education expenses; when present, `education` is derived from sum */
  educationItems?: ExpenseItem[];
  donationGeneral: number;
  donationPolitical: number;
  donationHometown: number;
  /** Itemized donations; when present, donationGeneral/donationHometown are derived */
  donationItems?: ExpenseItem[];
  pensionSaving: number;
  irp: number;
  housingSaving: number;
  monthlyRent: number;
  insurance: number;
  isSingleParent: boolean;
  /** 부녀자공제 대상 여부 (배우자 있는 여성 또는 부양가족 있는 여성 세대주, 종합소득 3천만 이하) */
  isFemaleWorker?: boolean;
}

export interface YearData {
  year: number;
  salaries: MonthlySalary[];
  bonuses: Bonus[];
  cards: MonthlyCardSpending[];
  deductions: Deductions;
  family: FamilyMember[];
}

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
  deduction: number;
}

export interface IncomeDeductionTier {
  min: number;
  max: number | null;
  formula: string;
}

export interface TaxRules {
  year: number;
  taxBrackets: TaxBracket[];
  earnedIncomeDeduction: IncomeDeductionTier[];
  insurance: {
    nationalPension: { rate: number; maxBase: number };
    healthInsurance: { rate: number };
    longTermCare: { rate: number; basedOn: string };
    employment: { rate: number };
  };
  personalDeduction: {
    basic: number;
    elderly: number;
    disabled: number;
    singleParent: number;
    femaleWorker: number;
  };
  creditCardDeduction: {
    thresholdRate: number;
    rates: {
      creditCard: number;
      checkCard: number;
      cashReceipt: number;
      traditionalMarket: number;
      publicTransport: number;
      books: number;
    };
    limits: Array<{ salaryMax: number | null; baseLimit: number }>;
    additionalLimit: {
      traditionalMarket: number;
      publicTransport: number;
      books: number;
    };
  };
  taxCredits: {
    earnedIncome: {
      tier1: { max: number; rate: number };
      tier2: { rate: number };
      /** 총급여별 근로소득세액공제 한도 (74/66/50/20만). 위에서부터 매칭 */
      limitBrackets: Array<{
        salaryMax: number | null;
        /** 구간 시작 한도값 */
        base: number;
        /** 한도 감액 기준 총급여 (이 값을 초과한 만큼 taper 적용) */
        from: number;
        /** 총급여 초과분당 감액률 */
        taper: number;
        /** 한도 하한 */
        floor: number;
      }>;
    };
    /** 특별소득공제·특별세액공제·월세를 적용받지 않을 때의 표준세액공제 */
    standardCredit: number;
    child: {
      '1': number;
      '2': number;
      '3+': { base: number; perChild: number };
    };
    pensionAccount: {
      rateLow: number;
      rateHigh: number;
      salaryThreshold: number;
      limits: { pensionSaving: number; total: number };
    };
    medical: {
      thresholdRate: number;
      rate: number;
      infertility: number;
      premature: number;
    };
    donation: {
      general: { underLimit: number; overLimit: number; threshold: number };
      /** 고향사랑기부: 10만 이하 100/110(지방세 합산 100%), 초과분 over100k, 연 limit 한도 */
      hometown: { under100k: number; over100k: number; limit: number };
      /** 정치자금기부: 10만 이하 100/110, 10만~midMax midRate, 초과 highRate */
      political: { tier1Max: number; tier1Rate: number; midMax: number; midRate: number; highRate: number };
    };
    monthlyRent: {
      rateLow: number;
      rateHigh: number;
      salaryThreshold: number;
      limit: number;
    };
  };
}

export interface CalculationLine {
  label: string;
  amount: number;
  kind: 'income' | 'deduction' | 'subtotal' | 'tax' | 'credit' | 'result';
  note?: string;
}

export interface TaxCalculationResult {
  totalGrossPay: number;
  totalNonTaxable: number;
  totalTaxableIncome: number;
  earnedIncomeDeduction: number;
  earnedIncomeAmount: number;
  personalDeduction: number;
  insuranceDeduction: number;
  creditCardDeduction: number;
  housingSavingDeduction: number;
  totalIncomeDeduction: number;
  taxBase: number;
  appliedRate: number;
  calculatedTax: number;
  earnedIncomeCredit: number;
  childCredit: number;
  pensionAccountCredit: number;
  medicalCredit: number;
  educationCredit: number;
  donationCredit: number;
  insuranceCredit: number;
  monthlyRentCredit: number;
  /** 표준세액공제 (특별공제 대신 적용된 경우 13만원, 아니면 0) */
  standardCredit: number;
  totalTaxCredits: number;
  /** 결정세액 (소득세분만) — 산출세액 − 세액공제 */
  determinedTaxIncome: number;
  /** 지방소득세 = determinedTaxIncome × 10% */
  localTaxOnDetermined: number;
  /** 결정세액 합계 (소득세 + 지방세) — 사용자가 보는 환급/추납 기준 */
  determinedTax: number;
  prepaidTax: number;
  refund: number;
  lines: CalculationLine[];
  /** 소득공제·세액공제가 전혀 없었다면 내야 했을 세금 (근로소득공제는 강제 적용) */
  grossTaxIfNoDeductions: number;
  /** 소득공제로 줄어든 세금 */
  incomeDeductionSaving: number;
  /** 세액공제로 줄어든 세금 (= totalTaxCredits, capped at calculatedTax) */
  taxCreditSaving: number;
  /** 총 절세액 = incomeDeductionSaving + taxCreditSaving */
  totalSaving: number;
}
