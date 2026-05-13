import type { AgeBracket } from '@/types';

/** 한국 연령 기준 (만 나이): 기준 연도 - 출생연도 */
export function getAge(birthYear: number | undefined, year: number): number | null {
  if (!birthYear || birthYear < 1900 || birthYear > year) return null;
  return year - birthYear;
}

/**
 * 청년: 만 19~34세 (청년 우대 정책 기본 범위 — 청년형 장기펀드, 청년 우대 주택청약, 중기청 감면 등)
 * 중장년: 만 35~64세
 * 시니어: 만 65세 이상 (경로우대)
 */
export function getAgeBracket(age: number | null): AgeBracket | null {
  if (age == null) return null;
  if (age >= 19 && age <= 34) return 'youth';
  if (age >= 65) return 'senior';
  return 'middle';
}

export function ageBracketLabel(bracket: AgeBracket | null): string {
  if (bracket === 'youth') return '청년';
  if (bracket === 'middle') return '중장년';
  if (bracket === 'senior') return '시니어';
  return '';
}
