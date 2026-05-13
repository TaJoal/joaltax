const krw = new Intl.NumberFormat('ko-KR');

const MAN = 10_000;
const EOK = 100_000_000;

/**
 * 모든 금액을 "만원" 단위로 표시한다.
 * - 1억 이상: "1.2억" (1 decimal)
 * - 1만 이상: "350만원", "1,234만원"
 * - 1만 미만: "3천원" (= 3,000원), "5백원"
 * - 0: "0원"
 *
 * 내부 저장값은 그대로 원 단위(정수). 표시만 만원으로 환산한다.
 */
export function won(n: number): string {
  if (!Number.isFinite(n)) return '0원';
  const v = Math.round(n);
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs === 0) return '0원';
  if (abs >= EOK) {
    const eok = abs / EOK;
    return `${sign}${eok.toFixed(eok >= 10 ? 0 : 1)}억`;
  }
  if (abs >= MAN) {
    const man = Math.round(abs / MAN);
    return `${sign}${krw.format(man)}만원`;
  }
  // < 1만원
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}천원`;
  return `${sign}${krw.format(abs)}원`;
}

/**
 * 짧은 표시 — 차트 축, 카드 라벨 등 좁은 공간용.
 * "350만", "1.2억" 처럼 단위만 붙임.
 */
export function wonCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const v = Math.round(n);
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= EOK) {
    const eok = abs / EOK;
    return `${sign}${eok.toFixed(eok >= 10 ? 0 : 1)}억`;
  }
  if (abs >= MAN) {
    return `${sign}${Math.round(abs / MAN)}만`;
  }
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}천`;
  return `${sign}${krw.format(abs)}`;
}

export function num(n: number): string {
  return krw.format(Math.round(n));
}

export function percent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}
