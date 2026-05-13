import { useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import type { MonthlyCardSpending } from '@/types';
import { MoneyInput } from '@/components/common/MoneyInput';
import { won, wonCompact } from '@/utils/format';

const CARD_FIELDS: Array<{ key: keyof Omit<MonthlyCardSpending, 'month'>; label: string; icon: string }> = [
  { key: 'creditCard', label: '신용카드', icon: '💳' },
  { key: 'checkCard', label: '체크카드', icon: '💰' },
  { key: 'cashReceipt', label: '현금영수증', icon: '🧾' },
  { key: 'traditionalMarket', label: '전통시장', icon: '🛒' },
  { key: 'publicTransport', label: '대중교통', icon: '🚌' },
  { key: 'books', label: '도서·공연', icon: '📚' },
];

function monthTotal(c: MonthlyCardSpending): number {
  return c.creditCard + c.checkCard + c.cashReceipt + c.traditionalMarket + c.publicTransport + c.books;
}

export function MonthlyCardEditor() {
  const data = useDataStore((s) => s.data);
  const saveCards = useDataStore((s) => s.saveCards);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);

  if (!data) return null;

  const current = data.cards.find((c) => c.month === selectedMonth)!;
  const total = monthTotal(current);
  const annualTotal = data.cards.reduce((s, c) => s + monthTotal(c), 0);

  const update = (field: keyof Omit<MonthlyCardSpending, 'month'>, value: number) => {
    const next = data.cards.map((c) => (c.month === selectedMonth ? { ...c, [field]: value } : c));
    void saveCards(next);
  };

  const copyFromPrev = () => {
    const prev = data.cards.find((c) => c.month === selectedMonth - 1);
    if (!prev || monthTotal(prev) === 0) return;
    const next = data.cards.map((c) =>
      c.month === selectedMonth ? { ...prev, month: selectedMonth } : c,
    );
    void saveCards(next);
  };

  return (
    <>
      <div className="card">
        <h3 className="card-title">월 선택</h3>
        <div className="scroll-x" style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
          {data.cards.map((c) => {
            const t = monthTotal(c);
            const hasData = t > 0;
            return (
              <button
                key={c.month}
                type="button"
                onClick={() => setSelectedMonth(c.month)}
                className={`year-chip ${selectedMonth === c.month ? 'active' : ''}`}
                style={{
                  position: 'relative',
                  padding: '8px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  minWidth: 56,
                }}
              >
                <span>{c.month}월</span>
                {hasData && (
                  <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 500 }}>
                    {wonCompact(t)}
                  </span>
                )}
                {hasData && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 6,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: selectedMonth === c.month ? '#10b981' : '#94a3b8',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 className="card-title" style={{ margin: 0 }}>{selectedMonth}월 사용액</h3>
          <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {wonCompact(total)}
          </span>
        </div>
        <div className="card-subtle">실제 사용한 금액을 입력하세요</div>

        {CARD_FIELDS.map((f) => (
          <div
            key={f.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 0',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <span
              className="icon"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--brand-soft)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 16,
              }}
            >
              {f.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
            </div>
            <div style={{ width: 130 }}>
              <MoneyInput value={current[f.key]} onChange={(v) => update(f.key, v)} suffix="" />
            </div>
          </div>
        ))}

        {selectedMonth > 1 && (() => {
          const prev = data.cards.find((c) => c.month === selectedMonth - 1);
          if (!prev || monthTotal(prev) === 0) return null;
          return (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 12 }}
              onClick={copyFromPrev}
            >
              ↑ {selectedMonth - 1}월 값 복사 ({wonCompact(monthTotal(prev))})
            </button>
          );
        })()}
      </div>

      <div className="callout info">
        <span className="ico">📅</span>
        <span>
          연간 누적 사용액 <strong>{won(annualTotal)}</strong>
        </span>
      </div>
    </>
  );
}
