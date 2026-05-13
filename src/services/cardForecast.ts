import type { MonthlyCardSpending, TaxRules } from '@/types';
import { computeCardDeduction } from './deductionService';

export interface CardForecast {
  filledMonths: number;
  monthlyAverage: {
    creditCard: number;
    checkCard: number;
    cashReceipt: number;
    traditionalMarket: number;
    publicTransport: number;
    books: number;
  };
  projected: MonthlyCardSpending[];
  projectedDeduction: number;
  scenarioCheckCard: {
    extraMonthly: number;
    extraDeduction: number;
    extraTaxSave: number;
  };
}

function hasAnySpending(c: MonthlyCardSpending): boolean {
  return (
    c.creditCard + c.checkCard + c.cashReceipt + c.traditionalMarket + c.publicTransport + c.books > 0
  );
}

export function forecastCardYear(
  cards: MonthlyCardSpending[],
  totalSalary: number,
  rules: TaxRules,
  marginalRate = 0.15,
): CardForecast {
  const filled = cards.filter(hasAnySpending);
  const filledMonths = filled.length;

  const sums = filled.reduce(
    (acc, c) => {
      acc.creditCard += c.creditCard;
      acc.checkCard += c.checkCard;
      acc.cashReceipt += c.cashReceipt;
      acc.traditionalMarket += c.traditionalMarket;
      acc.publicTransport += c.publicTransport;
      acc.books += c.books;
      return acc;
    },
    { creditCard: 0, checkCard: 0, cashReceipt: 0, traditionalMarket: 0, publicTransport: 0, books: 0 },
  );

  const denom = Math.max(1, filledMonths);
  const monthlyAverage = {
    creditCard: sums.creditCard / denom,
    checkCard: sums.checkCard / denom,
    cashReceipt: sums.cashReceipt / denom,
    traditionalMarket: sums.traditionalMarket / denom,
    publicTransport: sums.publicTransport / denom,
    books: sums.books / denom,
  };

  const projected: MonthlyCardSpending[] = cards.map((c) =>
    hasAnySpending(c)
      ? c
      : {
          month: c.month,
          creditCard: Math.round(monthlyAverage.creditCard),
          checkCard: Math.round(monthlyAverage.checkCard),
          cashReceipt: Math.round(monthlyAverage.cashReceipt),
          traditionalMarket: Math.round(monthlyAverage.traditionalMarket),
          publicTransport: Math.round(monthlyAverage.publicTransport),
          books: Math.round(monthlyAverage.books),
        },
  );

  const baseBreakdown = computeCardDeduction(totalSalary, projected, rules);

  const extraMonthly = 500000;
  const scenario = projected.map((c) => ({ ...c, checkCard: c.checkCard + extraMonthly }));
  const scenarioBreakdown = computeCardDeduction(totalSalary, scenario, rules);
  const extraDeduction = scenarioBreakdown.totalDeduction - baseBreakdown.totalDeduction;
  const extraTaxSave = extraDeduction * marginalRate;

  return {
    filledMonths,
    monthlyAverage,
    projected,
    projectedDeduction: baseBreakdown.totalDeduction,
    scenarioCheckCard: {
      extraMonthly,
      extraDeduction,
      extraTaxSave,
    },
  };
}
