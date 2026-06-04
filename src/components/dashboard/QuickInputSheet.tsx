import { useEffect, useRef, useState } from 'react';
import { Drawer } from 'antd';
import { useDataStore } from '@/store/dataStore';
import { useCalculation } from '@/hooks/useCalculation';
import { MoneyInput } from '@/components/common/MoneyInput';
import { won, wonCompact } from '@/utils/format';

export type QuickInputIntent = 'pension' | 'housing' | 'rent' | 'card' | 'insurance';

type DeductionFieldKey = 'pensionSaving' | 'irp' | 'housingSaving' | 'monthlyRent' | 'insurance';
type CardFieldKey = 'creditCard' | 'checkCard' | 'cashReceipt';
type FieldKey = DeductionFieldKey | CardFieldKey;

interface FieldDef {
  key: FieldKey;
  label: string;
  hint?: string;
}

interface IntentConfig {
  kind: 'deduction' | 'cardMonthly';
  icon: string;
  title: string;
  why: string;
  badges: string[];
  fields: FieldDef[];
  sharedLimit?: number;
  rate?: number;
  rateLabel?: string;
  footnote?: string;
}

const CONFIG: Record<QuickInputIntent, IntentConfig> = {
  pension: {
    kind: 'deduction',
    icon: '💰',
    title: '연금저축 / IRP',
    why: '연 900만원까지 12~15% 그대로 환급. 노후 준비도 되고 세금도 줄어요.',
    badges: ['합산 한도 900만', '공제율 12~15%'],
    fields: [
      { key: 'pensionSaving', label: '연금저축', hint: '단독 한도 연 600만' },
      { key: 'irp', label: 'IRP', hint: '연금저축과 합산 900만' },
    ],
    sharedLimit: 9_000_000,
    rate: 0.135,
    rateLabel: '약 13.5%',
  },
  housing: {
    kind: 'deduction',
    icon: '🏠',
    title: '주택청약저축',
    why: '월 25만원만 넣어도 약 18만원 절세 (총급여 7천 이하 무주택 세대주).',
    badges: ['한도 300만', '공제율 40%'],
    fields: [{ key: 'housingSaving', label: '연 납입액' }],
    sharedLimit: 3_000_000,
    rate: 0.4 * 0.15,
    rateLabel: '약 6%',
  },
  rent: {
    kind: 'deduction',
    icon: '🏘️',
    title: '월세',
    why: '연 1,000만원까지 15~17% 세액공제 (총급여 8천 이하).',
    badges: ['한도 1,000만', '공제율 15~17%'],
    fields: [{ key: 'monthlyRent', label: '연 월세 합계' }],
    sharedLimit: 10_000_000,
    rate: 0.16,
    rateLabel: '약 16%',
  },
  insurance: {
    kind: 'deduction',
    icon: '🛡️',
    title: '보장성 보험료',
    why: '실손/생명/상해 등 보장성 보험료 연 100만원까지 12% 세액공제.',
    badges: ['한도 100만', '공제율 12%'],
    fields: [{ key: 'insurance', label: '연 보장성 보험료' }],
    sharedLimit: 1_000_000,
    rate: 0.12,
    rateLabel: '12%',
  },
  card: {
    kind: 'cardMonthly',
    icon: '💳',
    title: '카드 · 현금영수증 (월 평균)',
    why: '연봉 25% 초과분부터 공제. 체크카드/현금영수증은 신용카드보다 공제율이 2배예요.',
    badges: ['신용 15% · 체크/현금 30%'],
    fields: [
      { key: 'creditCard', label: '월 신용카드' },
      { key: 'checkCard', label: '월 체크·직불카드' },
      { key: 'cashReceipt', label: '월 현금영수증' },
    ],
    footnote: '입력한 월 평균값이 12개월에 일괄 적용돼요. 월별로 다르게 입력하려면 [공제 입력]에서 ›',
  },
};

interface Props {
  open: boolean;
  intent: QuickInputIntent | null;
  onClose: () => void;
}

export function QuickInputSheet({ open, intent, onClose }: Props) {
  const data = useDataStore((s) => s.data);
  const saveDeductions = useDataStore((s) => s.saveDeductions);
  const saveCards = useDataStore((s) => s.saveCards);
  const { result } = useCalculation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState<Partial<Record<FieldKey, number>>>({});

  useEffect(() => {
    if (open && intent && data) {
      const c = CONFIG[intent];
      const init: Partial<Record<FieldKey, number>> = {};
      if (c.kind === 'deduction') {
        for (const f of c.fields) {
          init[f.key] = (data.deductions as unknown as Record<string, number>)[f.key];
        }
      } else {
        for (const f of c.fields) {
          const key = f.key as CardFieldKey;
          const total = data.cards.reduce((s, m) => s + (m[key] ?? 0), 0);
          init[f.key] = Math.round(total / 12);
        }
      }
      setDraft(init);
    }
  }, [open, intent, data]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const cfg = intent ? CONFIG[intent] : null;

  const persist = (next: Partial<Record<FieldKey, number>>) => {
    if (!data || !cfg) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (cfg.kind === 'deduction') {
        void saveDeductions({ ...data.deductions, ...(next as Partial<Record<DeductionFieldKey, number>>) });
      } else {
        const updated = data.cards.map((m) => ({
          ...m,
          creditCard: next.creditCard ?? m.creditCard,
          checkCard: next.checkCard ?? m.checkCard,
          cashReceipt: next.cashReceipt ?? m.cashReceipt,
        }));
        void saveCards(updated);
      }
    }, 400);
  };

  const onFieldChange = (key: FieldKey, v: number) => {
    const next = { ...draft, [key]: v };
    setDraft(next);
    persist(next);
  };

  const total = cfg ? cfg.fields.reduce((s, f) => s + (draft[f.key] ?? 0), 0) : 0;
  const limit = cfg?.sharedLimit ?? 0;
  const ratio = limit > 0 ? Math.min(1, total / limit) : 0;
  const remaining = Math.max(0, limit - total);
  const projectedExtraSaving = cfg && cfg.rate ? Math.round(remaining * cfg.rate) : 0;

  const refund = result?.refund ?? 0;
  const isRefund = refund >= 0;
  const hasLimit = !!cfg?.sharedLimit;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height="92%"
      closable={false}
      maskClosable
      styles={{
        body: { padding: 0, overflowY: 'auto', background: 'var(--bg)' },
        content: { borderRadius: '20px 20px 0 0', overflow: 'hidden' },
        wrapper: { maxWidth: 480, margin: '0 auto', left: 0, right: 0 },
      }}
    >
      {cfg && (
        <>
          <div
            style={{
              position: 'sticky',
              top: 0,
              background: 'var(--bg)',
              zIndex: 5,
              paddingTop: 12,
              paddingBottom: 10,
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                background: 'rgba(10,10,10,0.15)',
                margin: '0 auto 12px',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{cfg.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>
                  {cfg.title}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {cfg.badges.map((b) => (
                    <span
                      key={b}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--accent)',
                        background: 'var(--accent-soft)',
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary btn-sm"
                style={{ borderRadius: 999 }}
              >
                완료
              </button>
            </div>
          </div>

          <div style={{ padding: '14px 20px 40px' }}>
            <div
              style={{
                background: '#1c1b18',
                color: '#fff',
                borderRadius: 18,
                padding: '16px 18px',
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                지금 예상 {isRefund ? '환급' : '추가납부'}액
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  marginTop: 4,
                  color: isRefund ? '#a7f3d0' : '#fecaca',
                }}
              >
                {won(Math.abs(refund))}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
                입력하면 위 금액이 실시간으로 바뀌어요
              </div>
            </div>

            <div className="callout info" style={{ marginBottom: 14 }}>
              <span className="ico">💡</span>
              <span>{cfg.why}</span>
            </div>

            <div className="card" style={{ marginBottom: 14 }}>
              {cfg.fields.map((f) => (
                <div className="field" key={f.key}>
                  <label className="field-label">{f.label}</label>
                  <MoneyInput
                    value={draft[f.key] ?? 0}
                    onChange={(v) => onFieldChange(f.key, v)}
                  />
                  {f.hint && <div className="field-hint">{f.hint}</div>}
                </div>
              ))}

              {hasLimit && (
                <div style={{ marginTop: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--ink-muted)',
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    <span>한도 {wonCompact(limit)}</span>
                    <span>{Math.round(ratio * 100)}% 사용</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: 'var(--brand-soft)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${ratio * 100}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        transition: 'width 200ms ease',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {hasLimit && remaining > 0 && (
              <div className="callout" style={{ marginBottom: 14 }}>
                <span className="ico">📈</span>
                <span>
                  한도까지 <strong>{wonCompact(remaining)}</strong> 더 넣으면{' '}
                  <strong>약 {wonCompact(projectedExtraSaving)}</strong>
                  {' '}({cfg.rateLabel}) 추가 절세돼요.
                </span>
              </div>
            )}

            {cfg.footnote && (
              <div className="callout" style={{ marginBottom: 14 }}>
                <span className="ico">💡</span>
                <span>{cfg.footnote}</span>
              </div>
            )}

            <p
              style={{
                fontSize: 11,
                color: 'var(--ink-soft)',
                textAlign: 'center',
                lineHeight: 1.6,
                marginTop: 20,
              }}
            >
              입력은 자동 저장돼요. 완료를 누르거나 바깥을 탭하면 닫혀요.
            </p>
          </div>
        </>
      )}
    </Drawer>
  );
}
