import { useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useYearStore } from '@/store/yearStore';
import { getTaxRules } from '@/data/tax-rules';
import { calculate } from '@/services/taxCalculator';
import { computeCardDeduction, buildCardGuide } from '@/services/deductionService';
import { forecastCardYear } from '@/services/cardForecast';

export function useCalculation() {
  const data = useDataStore((s) => s.data);
  const year = useYearStore((s) => s.year);

  const rules = useMemo(() => getTaxRules(year), [year]);

  const result = useMemo(() => {
    if (!data) return null;
    return calculate({
      salaries: data.salaries,
      bonuses: data.bonuses,
      cards: data.cards,
      deductions: data.deductions,
      family: data.family,
      rules,
    });
  }, [data, rules]);

  const cardBreakdown = useMemo(() => {
    if (!data || !result) return null;
    return computeCardDeduction(result.totalTaxableIncome, data.cards, rules);
  }, [data, result, rules]);

  const cardGuide = useMemo(() => (cardBreakdown ? buildCardGuide(cardBreakdown) : null), [cardBreakdown]);

  const forecast = useMemo(() => {
    if (!data || !result) return null;
    const marginalRate = result.appliedRate || 0.15;
    return forecastCardYear(data.cards, result.totalTaxableIncome, rules, marginalRate);
  }, [data, result, rules]);

  return { result, rules, cardBreakdown, cardGuide, forecast };
}
