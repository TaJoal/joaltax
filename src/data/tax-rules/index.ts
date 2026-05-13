import type { TaxRules } from '@/types';
import rules2024 from './2024.json';
import rules2025 from './2025.json';
import rules2026 from './2026.json';

const ALL: Record<number, TaxRules> = {
  2024: rules2024 as TaxRules,
  2025: rules2025 as TaxRules,
  2026: rules2026 as TaxRules,
};

export function getTaxRules(year: number): TaxRules {
  const r = ALL[year];
  if (r) return r;
  const years = Object.keys(ALL).map(Number).sort();
  const fallback = years.reduce((acc, y) => (y <= year ? y : acc), years[0]);
  return ALL[fallback];
}

export function availableYears(): number[] {
  return Object.keys(ALL).map(Number).sort((a, b) => b - a);
}
