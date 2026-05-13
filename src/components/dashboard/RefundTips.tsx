import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { TaxCalculationResult, YearData } from '@/types';
import { won, wonCompact } from '@/utils/format';

interface Tip {
  key: string;
  icon: string;
  title: string;
  body: string;
  estimatedSaving: number;
  link: string;
  ctaLabel: string;
}

interface Props {
  result: TaxCalculationResult;
  data: YearData;
}

/**
 * Show actionable tips when user is in 추가납부 or low-refund territory.
 * Each tip estimates the potential 절세액 from a specific action.
 */
export function RefundTips({ result, data }: Props) {
  const tips = useMemo(() => buildTips(result, data), [result, data]);
  const isRefund = result.refund >= 0;
  const gapToBreakeven = isRefund ? 0 : -result.refund;

  if (tips.length === 0) return null;

  const totalPotentialSaving = tips.reduce((s, t) => s + t.estimatedSaving, 0);

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%)',
        border: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 22 }}>{isRefund ? '🔥' : '💸'}</span>
        <div>
          <h3 className="card-title" style={{ margin: 0, color: '#7c2d12' }}>
            {isRefund ? '환급 더 받는 방법' : '이번엔 당하지 말자'}
          </h3>
          <div style={{ fontSize: 11, color: '#9a3412', marginTop: 2 }}>
            {!isRefund && gapToBreakeven > 0 && (
              <>현재 추가납부 {wonCompact(gapToBreakeven)} · </>
            )}
            아래 항목 활용 시 최대 <strong>{won(totalPotentialSaving)}</strong> 절세 가능
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {tips.map((tip) => (
          <Link
            key={tip.key}
            to={tip.link}
            style={{
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>{tip.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{tip.title}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2, lineHeight: 1.5 }}>{tip.body}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                +{wonCompact(tip.estimatedSaving)}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{tip.ctaLabel} ›</div>
            </div>
          </Link>
        ))}
      </div>

      {!isRefund && gapToBreakeven > totalPotentialSaving && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.5)',
            borderRadius: 10,
            fontSize: 11,
            color: '#7c2d12',
            lineHeight: 1.6,
          }}
        >
          💡 모든 팁을 다 활용해도 환급까지 <strong>{wonCompact(gapToBreakeven - totalPotentialSaving)}</strong>가 모자라요.
          누락된 의료비·교육비 영수증이 있다면 추가해보세요.
        </div>
      )}
    </div>
  );
}

function buildTips(result: TaxCalculationResult, data: YearData): Tip[] {
  const tips: Tip[] = [];
  const rate = result.appliedRate || 0.15;

  // Tip 1: 연금저축 / IRP 한도까지 추가 납입
  const pensionUsed = (data.deductions.pensionSaving || 0) + (data.deductions.irp || 0);
  const pensionRemaining = Math.max(0, 9000000 - pensionUsed);
  if (pensionRemaining > 0) {
    // 연금계좌 세액공제율: 총급여 5500만 이하 15%, 초과 12%
    const pensionRate = result.totalTaxableIncome <= 55000000 ? 0.15 : 0.12;
    tips.push({
      key: 'pension',
      icon: '🏦',
      title: '연금저축·IRP 추가 납입',
      body: `합산 한도까지 ${wonCompact(pensionRemaining)} 더 가능 · 세액공제율 ${(pensionRate * 100).toFixed(0)}%`,
      estimatedSaving: pensionRemaining * pensionRate,
      link: '/deduction?tab=credit',
      ctaLabel: '입력',
    });
  }

  // Tip 2: 체크카드/현금영수증 전환
  const totalCardSpending = data.cards.reduce(
    (s, c) => s + c.creditCard + c.checkCard + c.cashReceipt,
    0,
  );
  const creditPortion = data.cards.reduce((s, c) => s + c.creditCard, 0);
  if (totalCardSpending > 0 && creditPortion / totalCardSpending > 0.5) {
    // 신용카드의 절반을 체크카드로 옮기면: spending × (30% - 15%) = spending × 15% → 그 금액의 한계세율만큼 절세
    // 단, 합산 한도 (보통 300만) 도달 시 추가 효과 없음
    const movableSpend = creditPortion * 0.3; // 보수적 추정: 30% 정도 옮긴다고 가정
    const extraDeduction = movableSpend * 0.15; // 30% - 15% = 15%p 차이
    const extraSaving = extraDeduction * rate;
    if (extraSaving >= 10000) {
      tips.push({
        key: 'checkCard',
        icon: '💰',
        title: '체크카드/현금영수증 전환',
        body: `신용카드 비중이 높아요. 일부를 체크카드로만 바꿔도 공제율이 15% → 30%로 2배`,
        estimatedSaving: extraSaving,
        link: '/deduction?tab=income',
        ctaLabel: '카드 보기',
      });
    }
  }

  // Tip 3: 주택청약 한도 활용
  const housingUsed = data.deductions.housingSaving || 0;
  if (housingUsed < 3000000 && result.totalTaxableIncome <= 70000000) {
    const remaining = 3000000 - housingUsed;
    // 주택청약: 납입액의 40%가 소득공제, 한도 300만
    const extraDeduction = remaining * 0.4;
    tips.push({
      key: 'housing',
      icon: '🏠',
      title: '주택청약 추가 납입',
      body: `한도까지 ${wonCompact(remaining)} 더 가능 · 40%를 과세표준에서 차감`,
      estimatedSaving: extraDeduction * rate,
      link: '/deduction?tab=income',
      ctaLabel: '입력',
    });
  }

  // Tip 4: 의료비 누락 체크
  if ((data.deductions.medicalItems?.length ?? 0) === 0 && data.deductions.medical === 0) {
    // 평균 가정: 본인 + 가족당 연 20만원 정도
    const familySize = 1 + data.family.length;
    const assumedMedical = familySize * 200000;
    const threshold = result.totalTaxableIncome * 0.03;
    const expectedCredit = Math.max(0, assumedMedical - threshold) * 0.15;
    if (expectedCredit >= 10000) {
      tips.push({
        key: 'medical',
        icon: '🏥',
        title: '의료비 영수증 빠뜨리지 않기',
        body: `병원·약국 영수증을 모아두면 총급여 3% 초과분의 15% 환급. 가족 영수증도 합산 가능`,
        estimatedSaving: expectedCredit,
        link: '/deduction?tab=credit',
        ctaLabel: '입력',
      });
    }
  }

  // Tip 5: 보장성 보험료
  const insuranceUsed = data.deductions.insurance || 0;
  if (insuranceUsed < 1000000) {
    const remaining = 1000000 - insuranceUsed;
    tips.push({
      key: 'insurance',
      icon: '🛡️',
      title: '보장성 보험료 확인',
      body: `자동차·실비·생명보험 등 보장성 보험료의 12%를 세액공제 (한도 100만원)`,
      estimatedSaving: remaining * 0.12,
      link: '/deduction?tab=credit',
      ctaLabel: '입력',
    });
  }

  // Sort by estimated saving descending, limit to top 4
  return tips.sort((a, b) => b.estimatedSaving - a.estimatedSaving).slice(0, 4);
}
