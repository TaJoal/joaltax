import { useEffect, useState } from 'react';

interface Props {
  /** Stored value in 원 (won) — keeps internal precision/compatibility with calc engine. */
  value: number;
  /** Returns 원-denominated value (= input * 10000). */
  onChange: (v: number) => void;
  /** Stored value bounds in 원. */
  min?: number;
  max?: number;
  placeholder?: string;
  /** Override suffix (default: "만원"). Pass "" to hide entirely. */
  suffix?: string;
  className?: string;
}

const fmt = new Intl.NumberFormat('ko-KR');
const MAN = 10_000;

/**
 * 사용자는 "만원 단위 정수"로 입력한다.
 * 예: "350" 입력 → onChange(3,500,000원).
 * 표시도 만원 기준 ("350만원").
 */
export function MoneyInput({
  value,
  onChange,
  min = 0,
  max,
  placeholder,
  suffix = '만원',
  className,
}: Props) {
  // placeholder는 숫자만 — 단위는 우측 suffix가 항상 표시. CSS opacity를 더 낮춰 입력값과 분리.
  const composedPlaceholder = placeholder || '0';
  // local string state so user can clear/edit freely without losing focus
  const [draft, setDraft] = useState<string>(() =>
    value === 0 ? '' : fmt.format(Math.round(value / MAN)),
  );

  // Sync from outside changes (parent updated value while we weren't focused)
  useEffect(() => {
    const externalMan = value === 0 ? '' : fmt.format(Math.round(value / MAN));
    setDraft((prev) => {
      const prevWon = prev ? Number(prev.replace(/[^0-9]/g, '')) * MAN : 0;
      // Only overwrite if external value diverges (avoid clobbering mid-typing)
      if (Math.round(prevWon / MAN) !== Math.round(value / MAN)) return externalMan;
      return prev;
    });
  }, [value]);

  return (
    <div className="input-group">
      <input
        className={`input amount ${className ?? ''}`}
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^0-9]/g, '');
          if (cleaned === '') {
            setDraft('');
            onChange(0);
            return;
          }
          let manVal = Number(cleaned);
          let wonVal = manVal * MAN;
          // Apply bounds in 원
          if (min !== undefined) wonVal = Math.max(min, wonVal);
          if (max !== undefined) wonVal = Math.min(max, wonVal);
          manVal = Math.round(wonVal / MAN);
          setDraft(fmt.format(manVal));
          onChange(wonVal);
        }}
        placeholder={composedPlaceholder}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  );
}
