import type { MonthlyCardSpending, TaxRules } from '@/types';

export interface SourceContribution {
  spending: number;
  /** Spending above the 25% threshold (consumed in priority order: credit→check→cash) */
  contributingSpend: number;
  /** Raw deduction this source produced before the combined cap */
  rawDeduction: number;
}

export interface CardDeductionBreakdown {
  totalUsage: number;
  threshold: number;
  baseLimit: number;
  excess: number;
  rawDeduction: number;
  additional: { traditionalMarket: number; publicTransport: number; books: number };
  totalDeduction: number;
  appliedLimit: number;
  utilizationByLimit: number;
  /** Per-source breakdown for 신용/체크/현금 */
  sources: {
    creditCard: SourceContribution;
    checkCard: SourceContribution;
    cashReceipt: SourceContribution;
  };
}

export function totalCardUsage(cards: MonthlyCardSpending[]): number {
  return cards.reduce(
    (acc, c) =>
      acc +
      c.creditCard +
      c.checkCard +
      c.cashReceipt +
      c.traditionalMarket +
      c.publicTransport +
      c.books,
    0,
  );
}

export function pickBaseLimit(totalSalary: number, rules: TaxRules): number {
  const tier = rules.creditCardDeduction.limits.find(
    (l) => l.salaryMax === null || totalSalary <= l.salaryMax,
  );
  return tier?.baseLimit ?? 2000000;
}

export function computeCardDeduction(
  totalSalary: number,
  cards: MonthlyCardSpending[],
  rules: TaxRules,
): CardDeductionBreakdown {
  const usage = totalCardUsage(cards);
  const threshold = totalSalary * rules.creditCardDeduction.thresholdRate;
  const baseLimit = pickBaseLimit(totalSalary, rules);

  const sums = cards.reduce(
    (acc, c) => {
      acc.creditCard += c.creditCard;
      acc.checkCard += c.checkCard;
      acc.cashReceipt += c.cashReceipt;
      acc.traditionalMarket += c.traditionalMarket;
      acc.publicTransport += c.publicTransport;
      acc.books += c.books;
      return acc;
    },
    {
      creditCard: 0,
      checkCard: 0,
      cashReceipt: 0,
      traditionalMarket: 0,
      publicTransport: 0,
      books: 0,
    },
  );

  // Compute threshold consumption in priority order: credit → check → cash
  let remainingThreshold = threshold;
  const consumed: Record<'creditCard' | 'checkCard' | 'cashReceipt', number> = {
    creditCard: 0,
    checkCard: 0,
    cashReceipt: 0,
  };
  for (const k of ['creditCard', 'checkCard', 'cashReceipt'] as const) {
    const c = Math.min(remainingThreshold, sums[k]);
    consumed[k] = c;
    remainingThreshold -= c;
  }

  const rates = rules.creditCardDeduction.rates;
  const sources = {
    creditCard: {
      spending: sums.creditCard,
      contributingSpend: Math.max(0, sums.creditCard - consumed.creditCard),
      rawDeduction:
        Math.max(0, sums.creditCard - consumed.creditCard) * rates.creditCard,
    },
    checkCard: {
      spending: sums.checkCard,
      contributingSpend: Math.max(0, sums.checkCard - consumed.checkCard),
      rawDeduction:
        Math.max(0, sums.checkCard - consumed.checkCard) * rates.checkCard,
    },
    cashReceipt: {
      spending: sums.cashReceipt,
      contributingSpend: Math.max(0, sums.cashReceipt - consumed.cashReceipt),
      rawDeduction:
        Math.max(0, sums.cashReceipt - consumed.cashReceipt) * rates.cashReceipt,
    },
  };

  const excess = Math.max(0, usage - threshold);

  if (excess === 0) {
    return {
      totalUsage: usage,
      threshold,
      baseLimit,
      excess: 0,
      rawDeduction: 0,
      additional: { traditionalMarket: 0, publicTransport: 0, books: 0 },
      totalDeduction: 0,
      appliedLimit: baseLimit,
      utilizationByLimit: 0,
      sources,
    };
  }

  // Additional categories deduction (after threshold consumed by base sources)
  const additionalRaw = {
    traditionalMarket: sums.traditionalMarket * rates.traditionalMarket,
    publicTransport: sums.publicTransport * rates.publicTransport,
    books: sums.books * rates.books,
  };

  const rawDeduction =
    sources.creditCard.rawDeduction
    + sources.checkCard.rawDeduction
    + sources.cashReceipt.rawDeduction;

  const baseDeduction = Math.min(rawDeduction, baseLimit);

  const addLimits = rules.creditCardDeduction.additionalLimit;
  const additional = {
    traditionalMarket: Math.min(additionalRaw.traditionalMarket, addLimits.traditionalMarket),
    publicTransport: Math.min(additionalRaw.publicTransport, addLimits.publicTransport),
    books: Math.min(additionalRaw.books, addLimits.books),
  };

  const totalDeduction = baseDeduction + additional.traditionalMarket + additional.publicTransport + additional.books;
  const utilizationByLimit = baseLimit > 0 ? Math.min(1, rawDeduction / baseLimit) : 0;

  return {
    totalUsage: usage,
    threshold,
    baseLimit,
    excess,
    rawDeduction,
    additional,
    totalDeduction,
    appliedLimit: baseLimit,
    utilizationByLimit,
    sources,
  };
}

export interface CardGuide {
  status: 'below-threshold' | 'in-base' | 'near-limit' | 'over-limit';
  message: string;
  level: 'info' | 'warning' | 'success';
}

export function buildCardGuide(breakdown: CardDeductionBreakdown): CardGuide {
  const { excess, totalUsage, threshold, rawDeduction, appliedLimit } = breakdown;
  if (excess === 0) {
    const remaining = threshold - totalUsage;
    return {
      status: 'below-threshold',
      level: 'info',
      message: `총급여의 25%(${Math.round(threshold).toLocaleString()}원) 초과분부터 공제됩니다. 앞으로 ${Math.round(remaining).toLocaleString()}원 더 써야 공제가 시작돼요.`,
    };
  }
  const ratio = appliedLimit > 0 ? rawDeduction / appliedLimit : 0;
  if (ratio >= 1) {
    return {
      status: 'over-limit',
      level: 'warning',
      message: `💡 신용카드/체크카드 공제 한도(${appliedLimit.toLocaleString()}원)에 도달했어요. 전통시장·대중교통·도서공연은 별도 한도가 있으니 이쪽으로 활용해보세요.`,
    };
  }
  if (ratio >= 0.8) {
    return {
      status: 'near-limit',
      level: 'warning',
      message: `💡 공제 한도의 ${Math.round(ratio * 100)}% 도달! 앞으로는 체크카드/현금영수증(공제율 30%)을 쓰시면 더 유리해요.`,
    };
  }
  return {
    status: 'in-base',
    level: 'success',
    message: `현재 공제 한도 활용률 ${Math.round(ratio * 100)}%. 잘 활용 중이에요.`,
  };
}
