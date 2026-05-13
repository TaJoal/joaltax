import { useEffect, useState, useMemo } from 'react';
import { Empty, Spin } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuthStore } from '@/store/authStore';
import { useYearStore } from '@/store/yearStore';
import { repositories } from '@/repositories';
import { getTaxRules, availableYears } from '@/data/tax-rules';
import { calculate } from '@/services/taxCalculator';
import type { TaxCalculationResult, YearData } from '@/types';
import { won, wonCompact } from '@/utils/format';

type Mode = 'historical' | 'whatif';

interface YearSummary {
  year: number;
  data: YearData;
  result: TaxCalculationResult;
}

/** 해당 연도의 저장 데이터 + 해당 연도 세법으로 계산 */
async function loadHistorical(profileKey: string, year: number): Promise<YearSummary> {
  const data = await repositories.yearData.getYearData(profileKey, year);
  const rules = getTaxRules(year);
  const result = calculate({
    salaries: data.salaries,
    bonuses: data.bonuses,
    cards: data.cards,
    deductions: data.deductions,
    family: data.family,
    rules,
  });
  return { year, data, result };
}

/** baseData는 그대로 두고 해당 연도의 세법만 적용해서 계산 (정부가 세법을 어떻게 바꿨는지 비교) */
function computeWithRules(baseData: YearData, year: number): YearSummary {
  const rules = getTaxRules(year);
  const result = calculate({
    salaries: baseData.salaries,
    bonuses: baseData.bonuses,
    cards: baseData.cards,
    deductions: baseData.deductions,
    family: baseData.family,
    rules,
  });
  return { year, data: baseData, result };
}

function diff(a: number, b: number) {
  return b - a;
}

function DiffBadge({ a, b, compact = true }: { a: number; b: number; compact?: boolean }) {
  const d = diff(a, b);
  if (d === 0) return <span className="diff-flat">±0</span>;
  const cls = d > 0 ? 'diff-up' : 'diff-down';
  const sign = d > 0 ? '+' : '−';
  return (
    <span className={cls}>
      {sign}{compact ? wonCompact(Math.abs(d)) : won(Math.abs(d))}
    </span>
  );
}

export function ComparisonPage() {
  const profile = useAuthStore((s) => s.currentProfile);
  const currentYear = useYearStore((s) => s.year);
  const [savedYears, setSavedYears] = useState<number[]>([]);
  const [mode, setMode] = useState<Mode>('whatif');
  const [selected, setSelected] = useState<number[]>([]);
  const [summaries, setSummaries] = useState<YearSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Load saved years and pick default mode
  useEffect(() => {
    if (!profile) return;
    void (async () => {
      const saved = await repositories.yearData.listYears(profile.key);
      // Filter "saved" to actually-populated (gross > 0) so empty 0-year doesn't pollute
      const populated: number[] = [];
      for (const y of saved) {
        const d = await repositories.yearData.getYearData(profile.key, y);
        if (d.salaries.some((s) => s.grossPay > 0)) populated.push(y);
      }
      setSavedYears(populated);
      // Default mode: historical iff ≥2 years of populated data, otherwise whatif
      const initialMode: Mode = populated.length >= 2 ? 'historical' : 'whatif';
      setMode(initialMode);
      // Default selection
      if (initialMode === 'historical') {
        setSelected(populated.slice(-2));
      } else {
        // pick all available rule years (default whatif comparison set)
        setSelected(availableYears().sort());
      }
    })();
  }, [profile]);

  // Recompute selection defaults when switching mode
  useEffect(() => {
    if (mode === 'historical') {
      setSelected(savedYears.slice(-2));
    } else {
      setSelected(availableYears().sort());
    }
  }, [mode, savedYears]);

  // Load summaries for the chosen years
  useEffect(() => {
    if (!profile || selected.length === 0) {
      setSummaries([]);
      return;
    }
    setLoading(true);
    if (mode === 'historical') {
      void Promise.all(selected.map((y) => loadHistorical(profile.key, y))).then((all) => {
        setSummaries(all);
        setLoading(false);
      });
    } else {
      // whatif: load current-year data once, then compute against each year's rules
      void repositories.yearData.getYearData(profile.key, currentYear).then((baseData) => {
        const all = selected.map((y) => computeWithRules(baseData, y));
        setSummaries(all);
        setLoading(false);
      });
    }
  }, [profile, selected, mode, currentYear]);

  const refundChartData = useMemo(
    () =>
      summaries.map((s) => ({
        year: `${s.year}`,
        환급: s.result.refund >= 0 ? s.result.refund : -s.result.refund,
        isRefund: s.result.refund >= 0,
      })),
    [summaries],
  );

  const toggleYear = (y: number) => {
    setSelected((prev) =>
      prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y].sort(),
    );
  };

  if (!profile) return null;

  const a = summaries[0];
  const b = summaries[summaries.length - 1];
  const showDiff = summaries.length >= 2;
  const yearChips = mode === 'historical' ? savedYears : availableYears().sort();

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">연도 비교</h1>
        <p className="page-subtitle">
          {mode === 'historical'
            ? '내가 입력한 과거 데이터를 비교해요'
            : `${currentYear}년 내 데이터를 다른 해 세법에 적용해서 비교`}
        </p>
      </div>

      {/* ───── Mode toggle ───── */}
      <div className="segmented" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`segmented-item ${mode === 'whatif' ? 'active' : ''}`}
          onClick={() => setMode('whatif')}
        >
          ⚖️ 세법 비교
        </button>
        <button
          type="button"
          className={`segmented-item ${mode === 'historical' ? 'active' : ''}`}
          onClick={() => setMode('historical')}
          disabled={savedYears.length === 0}
          style={savedYears.length === 0 ? { opacity: 0.4 } : undefined}
        >
          📅 내 데이터 비교
        </button>
      </div>

      {/* ───── Mode explanation ───── */}
      <div
        className="callout info"
        style={{ marginBottom: 12, fontSize: 12, lineHeight: 1.55 }}
      >
        <span className="ico">{mode === 'whatif' ? '⚖️' : '📅'}</span>
        <span>
          {mode === 'whatif' ? (
            <>
              <strong>같은 연봉·카드·가족 조건</strong>으로 여러 연도 세법을 적용해 비교해요.<br />
              정부가 세금을 더 걷는지·혜택을 늘렸는지 한눈에 보여요.
            </>
          ) : (
            <>
              <strong>실제 입력한 연도별 데이터</strong>를 비교해요.<br />
              {savedYears.length < 2
                ? '데이터가 1개 연도뿐이라 비교가 제한될 수 있어요.'
                : `${savedYears.length}개 연도의 데이터가 있어요.`}
            </>
          )}
        </span>
      </div>

      {/* ───── Year chips ───── */}
      <div className="card-flat">
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-muted)',
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          {mode === 'whatif' ? '비교할 세법 연도' : '비교할 데이터 연도'}
        </div>
        <div className="year-chips">
          {yearChips.length === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              저장된 연도 데이터가 없어요
            </span>
          ) : (
            yearChips.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => toggleYear(y)}
                className={`year-chip ${selected.includes(y) ? 'active' : ''}`}
              >
                {y}년{mode === 'whatif' && y === currentYear && ' (기준)'}
              </button>
            ))
          )}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
          <Spin />
        </div>
      )}

      {!loading && summaries.length === 0 && (
        <div className="card">
          <Empty description="비교할 연도를 선택해주세요" />
        </div>
      )}

      {!loading && showDiff && a && b && (
        <>
          <div className="hero">
            <span className="hero-tag">
              {a.year}년 → {b.year}년 {mode === 'whatif' ? '세법 변화' : '변화'}
            </span>
            <p className="hero-label">
              {mode === 'whatif' ? '같은 조건이면 환급액 차이' : '환급액 차이'}
            </p>
            {(() => {
              const delta = b.result.refund - a.result.refund;
              const isFlat = Math.abs(delta) < 1000;
              const isPositive = delta > 0;
              return (
                <p
                  className={`hero-amount ${
                    isFlat ? '' : isPositive ? 'success' : 'warn'
                  }`}
                  style={isFlat ? { color: 'rgba(255,255,255,0.85)' } : undefined}
                >
                  {isFlat ? '변화 없음' : `${isPositive ? '+' : '-'}${won(Math.abs(delta))}`}
                </p>
              );
            })()}
            <div className="hero-hint">
              {a.year}년 {a.result.refund >= 0 ? '+' : '-'}
              {wonCompact(Math.abs(a.result.refund))} → {b.year}년{' '}
              {b.result.refund >= 0 ? '+' : '-'}
              {wonCompact(Math.abs(b.result.refund))}
              {mode === 'whatif' && (() => {
                const delta = b.result.refund - a.result.refund;
                const isFlat = Math.abs(delta) < 1000;
                const isPositive = delta > 0;
                return (
                  <>
                    <br />
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
                      💡{' '}
                      {isFlat
                        ? `${a.year}년과 ${b.year}년 세법이 사실상 동일해요`
                        : isPositive
                        ? `${b.year}년 세법이 ${wonCompact(Math.abs(delta))} 유리해요 (정부가 더 돌려줌)`
                        : `${b.year}년 세법이 ${wonCompact(Math.abs(delta))} 불리해요 (정부가 덜 돌려줌·더 걷음)`}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">환급/추가납부 비교</h3>
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <BarChart
                  data={refundChartData}
                  margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
                >
                  <XAxis dataKey="year" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={10}
                    tickFormatter={(v) => wonCompact(v)}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(v) => won(Number(v))}
                    contentStyle={{
                      borderRadius: 12,
                      border: 'none',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="환급" radius={[8, 8, 0, 0]}>
                    {refundChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.isRefund ? '#10b981' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!loading && summaries.length > 0 && (
        <div className="card">
          <h3 className="card-title">항목별 상세</h3>
          {(
            [
              ['총급여', (r: TaxCalculationResult) => r.totalGrossPay],
              ['과세대상 총급여', (r: TaxCalculationResult) => r.totalTaxableIncome],
              ['근로소득공제', (r: TaxCalculationResult) => r.earnedIncomeDeduction],
              ['인적공제', (r: TaxCalculationResult) => r.personalDeduction],
              ['4대보험 공제', (r: TaxCalculationResult) => r.insuranceDeduction],
              ['카드 등 공제', (r: TaxCalculationResult) => r.creditCardDeduction],
              ['과세표준', (r: TaxCalculationResult) => r.taxBase],
              ['산출세액', (r: TaxCalculationResult) => r.calculatedTax],
              ['세액공제 합계', (r: TaxCalculationResult) => r.totalTaxCredits],
              ['결정세액', (r: TaxCalculationResult) => r.determinedTax],
              ['기납부세액', (r: TaxCalculationResult) => r.prepaidTax],
            ] as const
          ).map(([label, picker]) => (
            <div key={label} className="stat-row">
              <span className="label">{label}</span>
              <span
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 2,
                }}
              >
                <span className="value">
                  {summaries.map((s, i) => (
                    <span
                      key={s.year}
                      style={{
                        marginLeft: i > 0 ? 8 : 0,
                        color:
                          i === summaries.length - 1
                            ? 'var(--ink)'
                            : 'var(--ink-soft)',
                      }}
                    >
                      {wonCompact(picker(s.result))}
                    </span>
                  ))}
                </span>
                {showDiff && a && b && (
                  <span style={{ fontSize: 11 }}>
                    <DiffBadge a={picker(a.result)} b={picker(b.result)} />
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
