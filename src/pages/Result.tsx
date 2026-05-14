import { Empty } from 'antd';
import { Link } from 'react-router-dom';
import { useCalculation } from '@/hooks/useCalculation';
import { useDataStore } from '@/store/dataStore';
import { won, wonCompact } from '@/utils/format';

interface UsageItem {
  icon: string;
  label: string;
  /** 한도 (원) */
  limit: number;
  /** 사용·납입액 (원) */
  used: number;
  /** 표시 모드: '납입' = 사용/납입액 기준, '공제' = 공제액 자체 기준 (카드처럼 한도가 공제액에 적용) */
  mode: '납입' | '공제';
  /** 한도까지 더 채울 시 절세 여지 (원). 0이면 hint 생략 */
  remainingSaving?: number;
  /** 적용 안 됨 사유 (총급여 초과 등). 있으면 회색 처리 */
  ineligibleReason?: string;
  /** 클릭 시 이동할 입력 화면 경로 */
  href: string;
  /** 카드 행 전용: 한도 채우기 위해 종류별로 더 사용해야 할 금액 시뮬 */
  cardFillSim?: {
    /** 한도까지 남은 공제액 (원) */
    remainingDeduction: number;
    /** 공제 시작점 (총급여 25%) */
    threshold: number;
    /** 현재까지 카드 사용 합계 */
    currentUsage: number;
    /** 공제 시작점까지 더 써야 할 금액 (0이면 이미 넘김) */
    untilStart: number;
    /** 신용카드만으로 한도 채울 때까지의 총 사용액 */
    byCreditTotal: number;
    /** 체크/현금영수증만으로 한도 채울 때까지의 총 사용액 */
    byCheckTotal: number;
    /** 신용카드로 추가 더 써야 할 금액 */
    byCreditExtra: number;
    /** 체크/현금으로 추가 더 써야 할 금액 */
    byCheckExtra: number;
  };
}

export function ResultPage() {
  const data = useDataStore((s) => s.data);
  const { result, cardBreakdown } = useCalculation();

  if (!result) {
    return (
      <div className="card">
        <Empty description="먼저 급여를 입력해주세요" />
      </div>
    );
  }

  const isRefund = result.refund >= 0;

  // 공제 활용률 데이터 — 한도 vs 사용/납입
  const usageItems: UsageItem[] = (() => {
    if (!data) return [];
    const d = data.deductions;
    const totalSalary = result.totalTaxableIncome;
    const items: UsageItem[] = [];

    // 신용카드 등 사용공제 — 공제액 자체가 한도에 걸림 (200~300만)
    if (cardBreakdown && cardBreakdown.appliedLimit > 0) {
      const remainingDeduction = Math.max(0, cardBreakdown.appliedLimit - cardBreakdown.totalDeduction);
      const untilStart = Math.max(0, cardBreakdown.threshold - cardBreakdown.totalUsage);
      // 한도 채우기 위한 총 사용액 (임계값 + 한도 / 공제율)
      const byCreditExtra = remainingDeduction > 0
        ? untilStart + Math.round(remainingDeduction / 0.15)
        : 0;
      const byCheckExtra = remainingDeduction > 0
        ? untilStart + Math.round(remainingDeduction / 0.30)
        : 0;
      const byCreditTotal = cardBreakdown.totalUsage + byCreditExtra;
      const byCheckTotal = cardBreakdown.totalUsage + byCheckExtra;
      items.push({
        icon: '💳',
        label: '신용카드 등 사용공제',
        limit: cardBreakdown.appliedLimit,
        used: Math.min(cardBreakdown.totalDeduction, cardBreakdown.appliedLimit),
        mode: '공제',
        href: '/deduction?tab=income',
        remainingSaving:
          cardBreakdown.totalDeduction < cardBreakdown.appliedLimit
            ? Math.round((cardBreakdown.appliedLimit - cardBreakdown.totalDeduction) * (result.appliedRate || 0.15))
            : 0,
        cardFillSim:
          remainingDeduction > 0
            ? {
                remainingDeduction,
                threshold: cardBreakdown.threshold,
                currentUsage: cardBreakdown.totalUsage,
                untilStart,
                byCreditTotal,
                byCheckTotal,
                byCreditExtra,
                byCheckExtra,
              }
            : undefined,
      });
    }

    // 연금저축+IRP — 합산 900만 한도 (납입액 기준)
    const pensionUsed = (d.pensionSaving || 0) + (d.irp || 0);
    items.push({
      icon: '💰',
      label: '연금저축 + IRP',
      limit: 9_000_000,
      used: pensionUsed,
      mode: '납입',
      href: '/deduction?tab=credit',
      remainingSaving:
        pensionUsed < 9_000_000
          ? Math.round((9_000_000 - pensionUsed) * (totalSalary <= 55_000_000 ? 0.15 : 0.12))
          : 0,
    });

    // 주택청약 — 300만 납입 한도, 총급여 7천만 이하만
    items.push({
      icon: '🏠',
      label: '주택청약',
      limit: 3_000_000,
      used: d.housingSaving || 0,
      mode: '납입',
      href: '/deduction?tab=income',
      remainingSaving:
        totalSalary > 70_000_000
          ? 0
          : (d.housingSaving || 0) < 3_000_000
            ? Math.round((3_000_000 - (d.housingSaving || 0)) * 0.4 * (result.appliedRate || 0.15))
            : 0,
      ineligibleReason: totalSalary > 70_000_000 ? '총급여 7천만원 초과 (대상 아님)' : undefined,
    });

    // 보장성 보험료 — 100만 한도
    items.push({
      icon: '🛡️',
      label: '보장성 보험료',
      limit: 1_000_000,
      used: d.insurance || 0,
      mode: '납입',
      href: '/deduction?tab=credit',
      remainingSaving:
        (d.insurance || 0) < 1_000_000
          ? Math.round((1_000_000 - (d.insurance || 0)) * 0.12)
          : 0,
    });

    // 월세 — 1000만 한도, 총급여 8천만 이하만
    items.push({
      icon: '🔑',
      label: '월세',
      limit: 10_000_000,
      used: d.monthlyRent || 0,
      mode: '납입',
      href: '/deduction?tab=credit',
      remainingSaving:
        totalSalary > 80_000_000
          ? 0
          : (d.monthlyRent || 0) < 10_000_000
            ? Math.round((10_000_000 - (d.monthlyRent || 0)) * (totalSalary <= 55_000_000 ? 0.17 : 0.15))
            : 0,
      ineligibleReason: totalSalary > 80_000_000 ? '총급여 8천만원 초과 (대상 아님)' : undefined,
    });

    return items;
  })();

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">연말정산 결과</h1>
        <p className="page-subtitle">단계별 계산 과정을 확인하세요</p>
      </div>

      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 12,
          padding: '12px 14px',
          marginBottom: 16,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
        <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.55 }}>
          <strong>이 결과는 추정치입니다.</strong>
          <br />
          <span style={{ color: '#a16207' }}>
            실제 홈택스 연말정산과 차이가 있을 수 있어요. 누락된 영수증·자동 자료·세법 개정 등이 반영되지 않습니다.
          </span>
        </div>
      </div>

      <div className="hero">
        <span className="hero-tag">
          {isRefund ? '환급' : '추가 납부'}
        </span>
        <p className="hero-label">{isRefund ? '예상 환급액' : '예상 추가 납부액'}</p>
        <p className={`hero-amount ${isRefund ? 'success' : 'warn'}`}>
          {won(Math.abs(result.refund))}
        </p>
        <div className="hero-hint">
          결정세액 {wonCompact(result.determinedTax)} · 기납부 {wonCompact(result.prepaidTax)}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">소득 → 과세표준</h3>
        {[
          { label: '총급여 (상여 포함)', amount: result.totalGrossPay, sign: '+' },
          { label: '비과세 (식대 등)', amount: -result.totalNonTaxable, sign: '-' },
        ].map((row) => (
          <div key={row.label} className="stat-row">
            <span className="label">{row.label}</span>
            <span className="value">
              {row.amount < 0 ? '-' : ''}{won(Math.abs(row.amount))}
            </span>
          </div>
        ))}
        <div className="stat-row subtotal">
          <span className="label">과세대상 총급여</span>
          <span className="value">{won(result.totalTaxableIncome)}</span>
        </div>
        <div className="stat-row">
          <span className="label">근로소득공제</span>
          <span className="value">-{won(result.earnedIncomeDeduction)}</span>
        </div>
        <div className="stat-row subtotal">
          <span className="label">근로소득금액</span>
          <span className="value">{won(result.earnedIncomeAmount)}</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">소득공제</h3>
        {[
          { label: '인적공제', amount: result.personalDeduction },
          { label: '4대보험 공제', amount: result.insuranceDeduction },
          { label: '신용카드 등 사용공제', amount: result.creditCardDeduction },
          { label: '주택청약 공제', amount: result.housingSavingDeduction },
        ].map((row) => (
          <div key={row.label} className="stat-row">
            <span className="label">{row.label}</span>
            <span className="value">-{won(row.amount)}</span>
          </div>
        ))}
        <div className="stat-row subtotal">
          <span className="label">과세표준</span>
          <span className="value">{won(result.taxBase)}</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">세액 계산</h3>
        <div className="stat-row">
          <span className="label">세율 {(result.appliedRate * 100).toFixed(0)}% 적용</span>
          <span className="value">{won(result.calculatedTax)}</span>
        </div>
        <div className="stat-row subtotal">
          <span className="label">산출세액</span>
          <span className="value">{won(result.calculatedTax)}</span>
        </div>
        {[
          { label: '근로소득 세액공제', amount: result.earnedIncomeCredit },
          { label: '자녀 세액공제', amount: result.childCredit },
          { label: '연금계좌 세액공제', amount: result.pensionAccountCredit },
          { label: '의료비 세액공제', amount: result.medicalCredit },
          { label: '교육비 세액공제', amount: result.educationCredit },
          { label: '기부금 세액공제', amount: result.donationCredit },
          { label: '보장성보험료 세액공제', amount: result.insuranceCredit },
          { label: '월세 세액공제', amount: result.monthlyRentCredit },
        ]
          .filter((row) => row.amount > 0)
          .map((row) => (
            <div key={row.label} className="stat-row">
              <span className="label">{row.label}</span>
              <span className="value">-{won(row.amount)}</span>
            </div>
          ))}
        <div className="stat-row">
          <span className="label">결정세액 (소득세)</span>
          <span className="value">{won(result.determinedTaxIncome)}</span>
        </div>
        <div className="stat-row">
          <span className="label">지방소득세 (소득세 × 10%)</span>
          <span className="value">+{won(result.localTaxOnDetermined)}</span>
        </div>
        <div className="stat-row subtotal">
          <span className="label">결정세액 합계 (지방세 포함)</span>
          <span className="value">{won(result.determinedTax)}</span>
        </div>
        <div className="stat-row">
          <span className="label">기납부 (소득세 + 지방세)</span>
          <span className="value">-{won(result.prepaidTax)}</span>
        </div>
        <div className={`stat-row result ${isRefund ? '' : 'warn'}`}>
          <span className="label">{isRefund ? '환급액' : '추가 납부액'}</span>
          <span className="value">
            {won(Math.abs(result.refund))}
          </span>
        </div>
      </div>

      {/* ========== 공제 활용률 ========== */}
      {usageItems.length > 0 && (
        <div className="card">
          <h3 className="card-title">공제 활용률</h3>
          <p className="card-subtle" style={{ marginTop: 4, marginBottom: 14 }}>
            한도 대비 얼마나 활용했는지 한눈에 봐요
          </p>
          {usageItems.map((it) => {
            const pct = it.ineligibleReason
              ? 0
              : Math.min(100, Math.round((it.used / Math.max(1, it.limit)) * 100));
            const isFull = pct >= 100;
            const colorClass = it.ineligibleReason
              ? ''
              : isFull
                ? 'success'
                : pct >= 80
                  ? 'warn'
                  : pct >= 30
                    ? 'accent'
                    : '';
            const RowTag = it.ineligibleReason ? 'div' : Link;
            const rowProps = it.ineligibleReason
              ? { className: 'usage-row ineligible' }
              : { to: it.href, className: 'usage-row clickable' };
            return (
              <RowTag key={it.label} {...(rowProps as any)}>
                <div className="usage-head">
                  <span className="usage-name">
                    <span className="usage-icon">{it.icon}</span>
                    {it.label}
                    {!it.ineligibleReason && <span className="usage-arrow">›</span>}
                  </span>
                  <span className={`usage-pct ${isFull ? 'full' : ''}`}>
                    {it.ineligibleReason ? '대상 아님' : `${pct}%`}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-bar ${colorClass}`}
                    style={{ width: `${it.ineligibleReason ? 0 : pct}%` }}
                  />
                </div>
                <div className="usage-meta">
                  <span>
                    {it.mode === '납입' ? '납입' : '공제'}{' '}
                    <strong>{won(it.used)}</strong> / 한도 {won(it.limit)}
                  </span>
                  {it.remainingSaving && it.remainingSaving > 0 ? (
                    <span className="usage-saving">
                      +{won(it.remainingSaving)} 절세 여지
                    </span>
                  ) : it.ineligibleReason ? (
                    <span className="usage-ineligible">{it.ineligibleReason}</span>
                  ) : isFull ? (
                    <span className="usage-full">한도 가득 ✓</span>
                  ) : null}
                </div>

                {/* 카드 공제 단계 시각화 + 카드 종류별 시뮬 */}
                {it.cardFillSim && (() => {
                  const sim = it.cardFillSim;
                  // 차트 폭 = 신용으로 한도 채우는 사용액 (가장 큼)
                  const chartMax = Math.max(sim.byCreditTotal, 1);
                  const thresholdPct = Math.min(100, (sim.threshold / chartMax) * 100);
                  const usagePct = Math.min(100, (sim.currentUsage / chartMax) * 100);
                  const checkEndPct = Math.min(100, (sim.byCheckTotal / chartMax) * 100);
                  // "이미 공제 받은" 영역: 임계값 ~ 사용액 (사용액이 임계값 넘었을 때만)
                  const overThreshold = sim.untilStart === 0;
                  const deductedFromPct = thresholdPct;
                  const deductedToPct = overThreshold ? usagePct : thresholdPct;
                  return (
                    <div className="card-fill-sim">
                      <div className="fill-sim-head">카드 공제 단계</div>

                      {/* 가로 막대 차트 */}
                      <div className="card-stage">
                        <div className="card-stage-bar">
                          {/* 회색 영역 (공제 안 됨): 0 ~ 임계값 */}
                          <div
                            className="stage-seg below"
                            style={{ left: 0, width: `${thresholdPct}%` }}
                          />
                          {/* 초록 영역 (이미 공제 받음): 임계값 ~ 사용액 */}
                          {overThreshold && deductedToPct > deductedFromPct && (
                            <div
                              className="stage-seg deducted"
                              style={{
                                left: `${deductedFromPct}%`,
                                width: `${deductedToPct - deductedFromPct}%`,
                              }}
                            />
                          )}
                          {/* 임계값 세로선 */}
                          <div className="stage-marker threshold" style={{ left: `${thresholdPct}%` }}>
                            <span className="marker-label">공제 시작</span>
                          </div>
                          {/* 체크/현금 한도 도달점 마커 */}
                          <div className="stage-marker checkpoint" style={{ left: `${checkEndPct}%` }}>
                            <span className="marker-label check">체크 한도</span>
                          </div>
                          {/* 신용 한도 도달점 (오른쪽 끝) */}
                          <div className="stage-marker creditpoint" style={{ left: '100%' }}>
                            <span className="marker-label credit">신용 한도</span>
                          </div>
                          {/* 현재 사용 위치 ▼ */}
                          <div className="stage-current" style={{ left: `${usagePct}%` }}>
                            <span className="current-arrow">▼</span>
                            <span className="current-label">지금 {wonCompact(sim.currentUsage)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 평이한 안내 문구 */}
                      <div className="fill-sim-explainer">
                        {sim.untilStart > 0 ? (
                          <>
                            <strong>총급여의 25%({won(sim.threshold)})까지는 공제 안 돼요.</strong>
                            {' '}앞으로 <strong>{won(sim.untilStart)}</strong> 더 써야 공제가 시작됩니다.
                          </>
                        ) : (
                          <>
                            <strong>공제 시작점({won(sim.threshold)}) 통과 ✓</strong>
                            {' '}초과분부터 카드 종류별 비율로 공제 받고 있어요.
                          </>
                        )}
                      </div>

                      {/* 한도 가득 채우려면 — 종류별 */}
                      <div className="fill-sim-options-head">
                        🎯 한도 가득 채우려면 — 카드별 추가 사용액
                      </div>
                      <div className="fill-sim-row">
                        <span className="fill-sim-icon">💳</span>
                        <span className="fill-sim-label">신용 <span className="fill-sim-rate">15%</span></span>
                        <span className="fill-sim-amount">+{won(sim.byCreditExtra)}</span>
                      </div>
                      <div className="fill-sim-row best">
                        <span className="fill-sim-icon">💰</span>
                        <span className="fill-sim-label">
                          체크·현금 <span className="fill-sim-rate">30%</span>
                          <span className="fill-sim-badge">절반!</span>
                        </span>
                        <span className="fill-sim-amount">+{won(sim.byCheckExtra)}</span>
                      </div>
                      <div className="fill-sim-hint">
                        같은 한도 채울 거면 체크카드·현금영수증이 절반만 써도 돼요
                      </div>
                    </div>
                  );
                })()}
              </RowTag>
            );
          })}
        </div>
      )}

      <div className="disclaimer-card">
        <div className="disclaimer-head">알아두세요</div>
        <ul className="disclaimer-list">
          <li>이 결과는 입력하신 정보 기반의 <strong>추정치</strong>입니다.</li>
          <li>실제 홈택스 연말정산과 다를 수 있어요 (의료비·교육비 자동 자료, 세법 개정 반영 차이 등).</li>
          <li>참고용으로만 사용하시고 실제 신고는 홈택스 또는 회사 양식으로 진행해주세요.</li>
          <li>입력하신 모든 데이터는 외부로 전송되지 않고 이 기기에만 저장돼요.</li>
        </ul>
      </div>
    </>
  );
}
