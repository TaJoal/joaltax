import type { CardDeductionBreakdown } from '@/services/deductionService';
import type { TaxRules } from '@/types';
import { won, wonCompact } from '@/utils/format';

interface Props {
  breakdown: CardDeductionBreakdown;
  rules: TaxRules;
}

interface SourceRow {
  key: 'creditCard' | 'checkCard' | 'cashReceipt';
  icon: string;
  label: string;
  rate: number;
  color: string;
  /** Soft individual reference cap; combined cap is still the only legal one */
  spending: number;
  rawDeduction: number;
}

interface AdditionalRow {
  key: 'traditionalMarket' | 'publicTransport' | 'books';
  icon: string;
  label: string;
  rate: number;
  color: string;
  current: number;
  limit: number;
}

export function CardLimitsPanel({ breakdown, rules }: Props) {
  const addLimits = rules.creditCardDeduction.additionalLimit;
  const rates = rules.creditCardDeduction.rates;

  const sources: SourceRow[] = [
    {
      key: 'creditCard',
      icon: '💳',
      label: '신용카드',
      rate: rates.creditCard,
      color: '#0a0a0a',
      spending: breakdown.sources.creditCard.spending,
      rawDeduction: breakdown.sources.creditCard.rawDeduction,
    },
    {
      key: 'checkCard',
      icon: '💰',
      label: '체크카드',
      rate: rates.checkCard,
      color: '#10b981',
      spending: breakdown.sources.checkCard.spending,
      rawDeduction: breakdown.sources.checkCard.rawDeduction,
    },
    {
      key: 'cashReceipt',
      icon: '🧾',
      label: '현금영수증',
      rate: rates.cashReceipt,
      color: '#4f46e5',
      spending: breakdown.sources.cashReceipt.spending,
      rawDeduction: breakdown.sources.cashReceipt.rawDeduction,
    },
  ];

  const additional: AdditionalRow[] = [
    { key: 'traditionalMarket', icon: '🛒', label: '전통시장', rate: rates.traditionalMarket, color: '#16a34a', current: breakdown.additional.traditionalMarket, limit: addLimits.traditionalMarket },
    { key: 'publicTransport', icon: '🚌', label: '대중교통', rate: rates.publicTransport, color: '#4f46e5', current: breakdown.additional.publicTransport, limit: addLimits.publicTransport },
    { key: 'books', icon: '📚', label: '도서·공연', rate: rates.books, color: '#f59e0b', current: breakdown.additional.books, limit: addLimits.books },
  ];

  const baseLimit = breakdown.baseLimit;
  const baseUsed = Math.min(breakdown.rawDeduction, baseLimit);
  const basePct = baseLimit > 0 ? (baseUsed / baseLimit) * 100 : 0;
  const baseRemaining = Math.max(0, baseLimit - baseUsed);

  // Per-source segment widths within the combined bar
  const sumRaw = sources.reduce((s, x) => s + x.rawDeduction, 0);
  const cappedTotal = Math.min(sumRaw, baseLimit);
  const sourceSegments = sources.map((s) => {
    const portion = sumRaw > 0 ? (s.rawDeduction / sumRaw) * cappedTotal : 0;
    const pctOfLimit = baseLimit > 0 ? (portion / baseLimit) * 100 : 0;
    return { ...s, portion, pctOfLimit };
  });

  // Nudge logic
  const creditDominant = sources[0].rawDeduction > sources[1].rawDeduction + sources[2].rawDeduction;
  const creditAlonePct =
    baseLimit > 0 ? (sources[0].rawDeduction / baseLimit) * 100 : 0;
  let nudge: { tone: 'info' | 'warn' | 'success'; text: string } | null = null;
  if (breakdown.excess === 0) {
    nudge = {
      tone: 'info',
      text: `총급여 25%(${wonCompact(breakdown.threshold)}) 초과분부터 공제됩니다. 그 이전엔 어떤 카드를 써도 공제 없어요.`,
    };
  } else if (basePct >= 100) {
    nudge = {
      tone: 'warn',
      text: '합산 한도 도달 ✓ 신용/체크/현금은 더 써도 공제 안 늘어나요. 전통시장·대중교통·도서공연은 별도 한도가 남아 있다면 거기로 쓰는 게 유리합니다.',
    };
  } else if (creditDominant && creditAlonePct >= 50) {
    const switchableSpend = baseRemaining / rates.checkCard;
    const wouldGainExtra = baseRemaining - baseRemaining * (rates.creditCard / rates.checkCard);
    nudge = {
      tone: 'warn',
      text: `💡 신용카드 비중이 큽니다. 앞으로는 체크카드/현금영수증을 쓰면 같은 ${wonCompact(switchableSpend)}로 공제를 ${wonCompact(baseRemaining)}까지 채울 수 있어요 (신용카드로는 ${wonCompact(baseRemaining / rates.creditCard)}이 필요). 약 ${wonCompact(wouldGainExtra)} 더 절세 가능.`,
    };
  } else if (basePct < 50) {
    nudge = {
      tone: 'info',
      text: `현재 공제율이 낮은 편이에요. 체크카드/현금영수증(30%)이 신용카드(15%)보다 2배 유리합니다.`,
    };
  } else {
    nudge = { tone: 'success', text: '✓ 균형 잡힌 카드 사용 패턴이에요.' };
  }

  return (
    <div className="card">
      <h3 className="card-title">카드 공제 현황</h3>

      {/* Combined limit summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600 }}>
          신용+체크+현금 합산 공제
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>
          {wonCompact(baseUsed)} / {wonCompact(baseLimit)}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
        {won(baseUsed)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 8 }}>
        합산 한도까지 <strong>{wonCompact(baseRemaining)}</strong> 더 공제 가능
      </div>

      {/* Combined stacked bar (per-source contribution) */}
      <div
        style={{
          display: 'flex',
          height: 14,
          borderRadius: 999,
          overflow: 'hidden',
          background: '#ebebef',
          marginBottom: 8,
        }}
      >
        {sourceSegments.map((seg) =>
          seg.pctOfLimit > 0 ? (
            <div
              key={seg.key}
              style={{
                width: `${seg.pctOfLimit}%`,
                background: seg.color,
                transition: 'width 0.4s',
              }}
              title={`${seg.label} 공제 ${won(seg.portion)}`}
            />
          ) : null,
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 10, color: 'var(--ink-muted)', marginBottom: 14 }}>
        {sourceSegments.filter((s) => s.pctOfLimit > 0).map((s) => (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            {s.label} {wonCompact(s.portion)}
          </span>
        ))}
      </div>

      {nudge && (
        <div className={`callout ${nudge.tone === 'warn' ? 'warn' : nudge.tone === 'success' ? 'success' : 'info'}`} style={{ marginBottom: 14 }}>
          <span className="ico">💡</span>
          <span>{nudge.text}</span>
        </div>
      )}

      {/* Per-source rows */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-muted)', marginBottom: 8 }}>
          종류별 사용 현황
        </div>
        {sources.map((s) => {
          const contribDed = Math.min(
            s.rawDeduction,
            sumRaw > 0 ? (s.rawDeduction / sumRaw) * baseLimit : 0,
          );
          const ratePct = (s.rate * 100).toFixed(0);
          const isPreferred = s.key !== 'creditCard';
          return (
            <div key={s.key} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-soft)', display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0 }}>
                  {s.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s.label}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: isPreferred ? '#d1fae5' : '#f3f3f5',
                        color: isPreferred ? '#065f46' : 'var(--ink-muted)',
                      }}
                    >
                      공제율 {ratePct}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                    사용 {wonCompact(s.spending)}
                    {s.rawDeduction > 0 && (
                      <>
                        {' '}→ 공제 기여 <strong style={{ color: 'var(--ink)' }}>{wonCompact(contribDed)}</strong>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {s.rawDeduction > 0 && (
                <div style={{ marginTop: 6, marginLeft: 42 }}>
                  <div className="progress-track" style={{ height: 5 }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(100, (contribDed / baseLimit) * 100)}%`,
                        background: s.color,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional separate limits */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-muted)', marginBottom: 8 }}>
          별도 한도 (각각 따로)
        </div>
        {additional.map((row) => {
          const pct = row.limit > 0 ? Math.min(100, (row.current / row.limit) * 100) : 0;
          const isAtCap = pct >= 100;
          const remaining = Math.max(0, row.limit - row.current);
          return (
            <div key={row.key} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{row.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{row.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                    공제율 {(row.rate * 100).toFixed(0)}% · 한도 {wonCompact(row.limit)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: isAtCap ? row.color : 'var(--ink)' }}>
                    {wonCompact(row.current)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                    {isAtCap ? '✓ 만함' : `${wonCompact(remaining)} 여유`}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 4 }}>
                <div className="progress-track" style={{ height: 4 }}>
                  <div className="progress-bar" style={{ width: `${pct}%`, background: row.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
