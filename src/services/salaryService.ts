import type { MonthlySalary, TaxRules } from '@/types';

export function computeInsuranceFromGross(gross: number, rules: TaxRules): {
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
} {
  const np = Math.min(gross, rules.insurance.nationalPension.maxBase) * rules.insurance.nationalPension.rate;
  const hi = gross * rules.insurance.healthInsurance.rate;
  const ltc = hi * rules.insurance.longTermCare.rate;
  const emp = gross * rules.insurance.employment.rate;
  return {
    nationalPension: Math.round(np),
    healthInsurance: Math.round(hi),
    longTermCare: Math.round(ltc),
    employmentInsurance: Math.round(emp),
  };
}

export function estimateMonthlyIncomeTax(gross: number): number {
  if (gross <= 1500000) return 0;
  if (gross <= 3000000) return Math.round((gross - 1500000) * 0.03);
  if (gross <= 5000000) return Math.round(45000 + (gross - 3000000) * 0.05);
  if (gross <= 8000000) return Math.round(145000 + (gross - 5000000) * 0.09);
  return Math.round(415000 + (gross - 8000000) * 0.18);
}

export function buildMonthlyFromGross(month: number, gross: number, rules: TaxRules, nonTaxable = 0): MonthlySalary {
  const taxable = Math.max(0, gross - nonTaxable);
  const ins = computeInsuranceFromGross(taxable, rules);
  const incomeTax = estimateMonthlyIncomeTax(taxable);
  const localIncomeTax = Math.round(incomeTax * 0.1);
  return {
    month,
    grossPay: gross,
    nationalPension: ins.nationalPension,
    healthInsurance: ins.healthInsurance,
    longTermCare: ins.longTermCare,
    employmentInsurance: ins.employmentInsurance,
    incomeTax,
    localIncomeTax,
    nonTaxable,
  };
}
