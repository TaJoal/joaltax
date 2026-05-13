import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TaxCalculationResult } from '@/types';
import { won, wonCompact } from '@/utils/format';

interface Props {
  result: TaxCalculationResult;
}

interface BreakdownItem {
  label: string;
  icon: string;
  amount: number;
  impact: number;
  link: string | null;
  hint?: string;
}

type Expanded = 'income' | 'credit' | null;

export function TaxFlowCard({ result }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Expanded>(null);

  const {
    grossTaxIfNoDeductions,
    incomeDeductionSaving,
    taxCreditSaving,
    determinedTax,
    totalSaving,
    refund,
  } = result;

  if (grossTaxIfNoDeductions <= 0) return null;

  const incomePct = (incomeDeductionSaving / grossTaxIfNoDeductions) * 100;
  const creditPct = (taxCreditSaving / grossTaxIfNoDeductions) * 100;
  const determinedPct = Math.max(0, 100 - incomePct - creditPct);
  const savingPct = (totalSaving / grossTaxIfNoDeductions) * 100;

  const rate = result.appliedRate || 0.15;

  const incomeItems: BreakdownItem[] = [
    {
      label: '인적공제',
      icon: '👨‍👩‍👧',
      amount: result.personalDeduction,
      impact: result.personalDeduction * rate,
      link: '/deduction?tab=family',
      hint: '본인·부양가족',
    },
    {
      label: '4대보험 공제',
      icon: '🏥',
      amount: result.insuranceDeduction,
      impact: result.insuranceDeduction * rate,
      link: '/salary',
      hint: '국민연금·건강·고용 등',
    },
    {
      label: '신용카드 등 공제',
      icon: '💳',
      amount: result.creditCardDeduction,
      impact: result.creditCardDeduction * rate,
      link: '/deduction?tab=income',
      hint: '카드·체크·현금영수증·전통시장',
    },
    {
      label: '주택청약 공제',
      icon: '🏠',
      amount: result.housingSavingDeduction,
      impact: result.housingSavingDeduction * rate,
      link: '/deduction?tab=income',
      hint: '연 300만원 한도, 40%',
    },
  ];

  const creditItems: BreakdownItem[] = [
    {
      label: '근로소득 세액공제',
      icon: '💼',
      amount: result.earnedIncomeCredit,
      impact: result.earnedIncomeCredit,
      link: null,
      hint: '자동 계산',
    },
    {
      label: '자녀 세액공제',
      icon: '👶',
      amount: result.childCredit,
      impact: result.childCredit,
      link: '/deduction?tab=family',
      hint: '자녀 수에 따라',
    },
    {
      label: '연금계좌 세액공제',
      icon: '🏦',
      amount: result.pensionAccountCredit,
      impact: result.pensionAccountCredit,
      link: '/deduction?tab=credit',
      hint: '연금저축·IRP',
    },
    {
      label: '의료비 세액공제',
      icon: '🏥',
      amount: result.medicalCredit,
      impact: result.medicalCredit,
      link: '/deduction?tab=credit',
      hint: '총급여 3% 초과분',
    },
    {
      label: '교육비 세액공제',
      icon: '🎓',
      amount: result.educationCredit,
      impact: result.educationCredit,
      link: '/deduction?tab=credit',
      hint: '15% 공제',
    },
    {
      label: '기부금 세액공제',
      icon: '🎁',
      amount: result.donationCredit,
      impact: result.donationCredit,
      link: '/deduction?tab=credit',
      hint: '일반·고향사랑',
    },
    {
      label: '보장성보험료 세액공제',
      icon: '🛡️',
      amount: result.insuranceCredit,
      impact: result.insuranceCredit,
      link: '/deduction?tab=credit',
      hint: '100만원 한도 · 12%',
    },
    {
      label: '월세 세액공제',
      icon: '🔑',
      amount: result.monthlyRentCredit,
      impact: result.monthlyRentCredit,
      link: '/deduction?tab=credit',
      hint: '총급여 8천만원 이하',
    },
  ];

  const isRefund = refund >= 0;

  return (
    <div className="card">
      <h3 className="card-title">세금이 이렇게 줄었어요</h3>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600 }}>
          공제 전 총 세액
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {won(grossTaxIfNoDeductions)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
          공제가 전혀 없었다면 내야 했을 세금
        </div>
      </div>

      {/* Horizontal stacked bar */}
      <div
        style={{
          display: 'flex',
          height: 14,
          borderRadius: 999,
          overflow: 'hidden',
          background: '#ebebef',
          marginBottom: 12,
        }}
      >
        {incomePct > 0 && (
          <div style={{ width: `${incomePct}%`, background: '#10b981', transition: 'width 0.4s' }} />
        )}
        {creditPct > 0 && (
          <div style={{ width: `${creditPct}%`, background: '#4f46e5', transition: 'width 0.4s' }} />
        )}
        {determinedPct > 0 && (
          <div style={{ width: `${determinedPct}%`, background: '#0a0a0a', transition: 'width 0.4s' }} />
        )}
      </div>

      {/* Expandable rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        <ExpandableRow
          color="#10b981"
          icon="📉"
          label="소득공제로 줄어든 세금"
          subLabel="과세표준을 낮춰서 절감"
          amount={incomeDeductionSaving}
          pct={incomePct}
          tone="save"
          expanded={expanded === 'income'}
          onToggle={() => setExpanded(expanded === 'income' ? null : 'income')}
          items={incomeItems}
          showImpact
          impactLabel={`× 세율 ${(rate * 100).toFixed(0)}%`}
          onNavigate={(link) => navigate(link)}
        />
        <ExpandableRow
          color="#4f46e5"
          icon="🎯"
          label="세액공제로 줄어든 세금"
          subLabel="세금에서 직접 차감"
          amount={taxCreditSaving}
          pct={creditPct}
          tone="save"
          expanded={expanded === 'credit'}
          onToggle={() => setExpanded(expanded === 'credit' ? null : 'credit')}
          items={creditItems}
          onNavigate={(link) => navigate(link)}
        />
        <FlowSummaryRow
          color="#0a0a0a"
          icon="💸"
          label="실제 결정세액"
          subLabel="이만큼만 세금으로 내요"
          amount={determinedTax}
          pct={determinedPct}
        />
      </div>

      {/* Summary banner */}
      {totalSaving > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #d1fae5 0%, #eef2ff 100%)',
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 24 }}>🎉</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#065f46' }}>총 절세 효과</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46', fontVariantNumeric: 'tabular-nums' }}>
              {won(totalSaving)}{' '}
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>
                ({savingPct.toFixed(0)}%↓)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Full cascade including refund */}
      <div style={{ padding: '14px 14px', background: 'var(--brand-soft)', borderRadius: 12 }}>
        <CascadeRow label="공제 전 총 세액" value={grossTaxIfNoDeductions} bold />
        <CascadeOp label="소득공제 절감" value={-incomeDeductionSaving} color="#10b981" />
        <CascadeRow label="산출세액" value={result.calculatedTax} muted />
        <CascadeOp label="세액공제 절감" value={-taxCreditSaving} color="#4f46e5" />
        <CascadeRow label="결정세액" value={determinedTax} bold />
        <CascadeOp label="기납부 세액" value={-result.prepaidTax} color="#6b7280" />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
            paddingTop: 10,
            borderTop: '2px solid rgba(10,10,10,0.08)',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: isRefund ? '#065f46' : '#92400e',
            }}
          >
            {isRefund ? '💰 환급액' : '⚠️ 추가 납부액'}
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              color: isRefund ? '#047857' : '#b45309',
            }}
          >
            {won(Math.abs(refund))}
          </span>
        </div>
      </div>
    </div>
  );
}

function ExpandableRow({
  color,
  icon,
  label,
  subLabel,
  amount,
  pct,
  expanded,
  onToggle,
  items,
  onNavigate,
  showImpact = false,
  impactLabel,
}: {
  color: string;
  icon: string;
  label: string;
  subLabel: string;
  amount: number;
  pct: number;
  tone: 'save' | 'pay';
  expanded: boolean;
  onToggle: () => void;
  items: BreakdownItem[];
  onNavigate: (link: string) => void;
  showImpact?: boolean;
  impactLabel?: string;
}) {
  const visibleItems = items.filter((i) => i.amount > 0);
  const hasItems = visibleItems.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasItems}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: hasItems ? 'pointer' : 'default',
          borderRadius: 8,
          textAlign: 'left',
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 4 }}>
            {label}
            {hasItems && (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--ink-soft)',
                  transition: 'transform 0.2s',
                  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  display: 'inline-block',
                }}
              >
                ›
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 1 }}>{subLabel}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: '#10b981',
            }}
          >
            −{wonCompact(amount)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>
            {pct.toFixed(0)}%
          </div>
        </div>
      </button>

      {expanded && hasItems && (
        <div
          style={{
            marginLeft: 32,
            marginTop: 4,
            marginBottom: 8,
            background: 'var(--surface-2)',
            borderRadius: 12,
            padding: '6px 4px',
          }}
        >
          {showImpact && impactLabel && (
            <div style={{ fontSize: 10, color: 'var(--ink-soft)', padding: '4px 12px 2px', fontWeight: 600 }}>
              {impactLabel} = 절감액
            </div>
          )}
          {visibleItems.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => item.link && onNavigate(item.link)}
              disabled={!item.link}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: item.link ? 'pointer' : 'default',
                textAlign: 'left',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                {item.hint && (
                  <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 1 }}>
                    {item.hint}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {showImpact && (
                  <div style={{ fontSize: 10, color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>
                    공제 {wonCompact(item.amount)}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: '#10b981',
                  }}
                >
                  −{wonCompact(item.impact)}
                </div>
              </div>
              {item.link && (
                <span style={{ color: 'var(--ink-soft)', fontSize: 14, marginLeft: 2 }}>›</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FlowSummaryRow({
  color,
  icon,
  label,
  subLabel,
  amount,
  pct,
}: {
  color: string;
  icon: string;
  label: string;
  subLabel: string;
  amount: number;
  pct: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 1 }}>{subLabel}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
          {wonCompact(amount)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>
          {pct.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function CascadeRow({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
      <span style={{ fontSize: 12, color: muted ? 'var(--ink-soft)' : 'var(--ink)', fontWeight: bold ? 700 : 500 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: bold ? 14 : 12,
          fontWeight: bold ? 800 : 600,
          fontVariantNumeric: 'tabular-nums',
          color: muted ? 'var(--ink-soft)' : 'var(--ink)',
        }}
      >
        {won(value)}
      </span>
    </div>
  );
}

function CascadeOp({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '2px 0 2px 12px' }}>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>↓ {label}</span>
      <span style={{ fontSize: 12, color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {value >= 0 ? '+' : '−'}{won(Math.abs(value))}
      </span>
    </div>
  );
}
