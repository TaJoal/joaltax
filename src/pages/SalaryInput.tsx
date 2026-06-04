import { useEffect, useMemo, useState } from 'react';
import { App as AntApp, Drawer } from 'antd';
import { useDataStore } from '@/store/dataStore';
import { useYearStore } from '@/store/yearStore';
import { getTaxRules } from '@/data/tax-rules';
import { computeInsuranceFromGross, estimateMonthlyIncomeTax } from '@/services/salaryService';
import { won, wonCompact } from '@/utils/format';
import type { MonthlySalary } from '@/types';
import { MoneyInput } from '@/components/common/MoneyInput';
import { Segmented } from '@/components/common/Segmented';
import { BonusEditor } from '@/components/salary/BonusEditor';

type Tab = 'quick' | 'monthly';
type SheetKind = 'paystub' | 'bonus' | null;

export function SalaryInputPage() {
  const data = useDataStore((s) => s.data);
  const applyRaiseFrom = useDataStore((s) => s.applyRaiseFrom);
  const saveSalaries = useDataStore((s) => s.saveSalaries);
  const year = useYearStore((s) => s.year);
  const rules = getTaxRules(year);
  const { message } = AntApp.useApp();

  const [tab, setTab] = useState<Tab>('quick');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [gross, setGross] = useState<number>(3500000);
  const [fromMonth, setFromMonth] = useState<number>(1);
  const [nonTaxable, setNonTaxable] = useState<number>(200000);
  const [incomeTax, setIncomeTax] = useState<number | null>(null);
  const [npOverride, setNpOverride] = useState<number | null>(null);
  const [hiOverride, setHiOverride] = useState<number | null>(null);
  const [ltcOverride, setLtcOverride] = useState<number | null>(null);
  const [empOverride, setEmpOverride] = useState<number | null>(null);

  useEffect(() => {
    if (data && data.salaries[0]?.grossPay > 0) {
      const first = data.salaries[0];
      setGross(first.grossPay);
      setNonTaxable(first.nonTaxable);
      const t = Math.max(0, first.grossPay - first.nonTaxable);
      const autoIT = estimateMonthlyIncomeTax(t);
      const autoTotal = autoIT + Math.round(autoIT * 0.1);
      const savedTotal = first.incomeTax + first.localIncomeTax;
      if (Math.abs(savedTotal - autoTotal) > 1000) {
        setIncomeTax(savedTotal);
      }
      const autoIns = computeInsuranceFromGross(t, rules);
      if (Math.abs(first.nationalPension - autoIns.nationalPension) > 1000) {
        setNpOverride(first.nationalPension);
      }
      if (Math.abs(first.healthInsurance - autoIns.healthInsurance) > 1000) {
        setHiOverride(first.healthInsurance);
      }
      if (Math.abs(first.longTermCare - autoIns.longTermCare) > 1000) {
        setLtcOverride(first.longTermCare);
      }
      if (Math.abs(first.employmentInsurance - autoIns.employmentInsurance) > 1000) {
        setEmpOverride(first.employmentInsurance);
      }
    }
  }, [data, rules]);

  const taxable = Math.max(0, gross - nonTaxable);
  const autoTax = useMemo(() => estimateMonthlyIncomeTax(taxable), [taxable]);
  const autoLocalTax = Math.round(autoTax * 0.1);
  const autoTotalTax = autoTax + autoLocalTax;
  const autoIns = useMemo(() => computeInsuranceFromGross(taxable, rules), [taxable, rules]);
  const usedTotalTax = incomeTax ?? autoTotalTax;
  const usedTax = incomeTax != null ? Math.round(incomeTax / 1.1) : autoTax;
  const usedLocalTax = usedTotalTax - usedTax;
  const usedNp = npOverride ?? autoIns.nationalPension;
  const usedHi = hiOverride ?? autoIns.healthInsurance;
  const usedLtc = ltcOverride ?? autoIns.longTermCare;
  const usedEmp = empOverride ?? autoIns.employmentInsurance;

  const hasPaystubOverride =
    incomeTax != null || npOverride != null || hiOverride != null || ltcOverride != null || empOverride != null;

  const preview = useMemo<MonthlySalary>(
    () => ({
      month: fromMonth,
      grossPay: gross,
      nonTaxable,
      nationalPension: usedNp,
      healthInsurance: usedHi,
      longTermCare: usedLtc,
      employmentInsurance: usedEmp,
      incomeTax: usedTax,
      localIncomeTax: usedLocalTax,
    }),
    [fromMonth, gross, nonTaxable, usedNp, usedHi, usedLtc, usedEmp, usedTax, usedLocalTax],
  );

  if (!data) return null;

  const onApply = async () => {
    await applyRaiseFrom(fromMonth, preview);
    message.success(`${fromMonth}월부터 12월까지 적용됐어요`);
  };

  const onUpdateMonth = async (idx: number, patch: Partial<MonthlySalary>) => {
    const next = data.salaries.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    await saveSalaries(next);
  };

  const totalGross = data.salaries.reduce((s, m) => s + m.grossPay, 0);
  const bonusCount = data.bonuses.length;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">급여 입력</h1>
        <p className="page-subtitle">월 1회만 입력해도 12개월 자동 적용돼요</p>
      </div>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'quick', label: '빠른 입력' },
          { value: 'monthly', label: '월별' },
        ]}
      />

      {tab === 'quick' && (
        <>
          <div className="card">
            <div className="field">
              <label className="field-label">월 총 지급액 (세전)</label>
              <MoneyInput value={gross} onChange={setGross} />
            </div>
            <div className="field">
              <label className="field-label">비과세 (식대 등, 월 20만원 한도)</label>
              <MoneyInput value={nonTaxable} onChange={setNonTaxable} max={200000} />
            </div>
            <div className="field">
              <label className="field-label">적용 시작 월</label>
              <div className="scroll-x" style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFromMonth(m)}
                    className={`year-chip ${fromMonth === m ? 'active' : ''}`}
                  >
                    {m}월
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <button
              type="button"
              onClick={() => setSheet('paystub')}
              className="rec-row"
            >
              <span className="rec-icon">📋</span>
              <div className="rec-text">
                <div className="rec-title">
                  명세서 그대로 옮기기
                  {hasPaystubOverride && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: 'var(--success-soft)',
                        color: '#065f46',
                        marginLeft: 6,
                      }}
                    >
                      직접 입력 중
                    </span>
                  )}
                </div>
                <div className="rec-desc">소득세 · 4대보험 — 명세서 그대로 옮기면 정확도 ↑</div>
              </div>
              <span style={{ color: 'var(--ink-soft)' }}>›</span>
            </button>

            <button
              type="button"
              onClick={() => setSheet('bonus')}
              className="rec-row"
            >
              <span className="rec-icon">🎁</span>
              <div className="rec-text">
                <div className="rec-title">상여금 추가</div>
                <div className="rec-desc">
                  {bonusCount > 0 ? `${bonusCount}건 등록됨` : '정기 · 성과 · 명절상여 등'}
                </div>
              </div>
              <span style={{ color: 'var(--ink-soft)' }}>›</span>
            </button>
          </div>

          <div className="card">
            <h3 className="card-title">월 공제 미리보기</h3>
            <div className="stat-row">
              <span className="label">
                국민연금{' '}
                {npOverride != null && (
                  <span className="field-tag success" style={{ marginLeft: 4 }}>
                    직접
                  </span>
                )}
              </span>
              <span className="value">{won(usedNp)}</span>
            </div>
            <div className="stat-row">
              <span className="label">
                건강보험{' '}
                {hiOverride != null && (
                  <span className="field-tag success" style={{ marginLeft: 4 }}>
                    직접
                  </span>
                )}
              </span>
              <span className="value">{won(usedHi)}</span>
            </div>
            <div className="stat-row">
              <span className="label">
                장기요양{' '}
                {ltcOverride != null && (
                  <span className="field-tag success" style={{ marginLeft: 4 }}>
                    직접
                  </span>
                )}
              </span>
              <span className="value">{won(usedLtc)}</span>
            </div>
            <div className="stat-row">
              <span className="label">
                고용보험{' '}
                {empOverride != null && (
                  <span className="field-tag success" style={{ marginLeft: 4 }}>
                    직접
                  </span>
                )}
              </span>
              <span className="value">{won(usedEmp)}</span>
            </div>
            <div className="stat-row">
              <span className="label">
                소득세{' '}
                {incomeTax != null && (
                  <span className="field-tag success" style={{ marginLeft: 4 }}>
                    직접
                  </span>
                )}
              </span>
              <span className="value">{won(usedTax)}</span>
            </div>
            <div className="stat-row">
              <span className="label">지방소득세 (10%)</span>
              <span className="value">{won(usedLocalTax)}</span>
            </div>
          </div>

          <button className="btn btn-primary btn-block" onClick={onApply} type="button">
            {fromMonth === 1 ? '1~12월 전체 적용' : `${fromMonth}~12월에 적용`}
          </button>
        </>
      )}

      {tab === 'monthly' && (
        <div className="card">
          <h3 className="card-title">월별 보기 / 수정</h3>
          <div className="card-subtle">연간 총급여 {wonCompact(totalGross)}</div>
          {data.salaries.map((m, i) => {
            const ins =
              m.nationalPension + m.healthInsurance + m.longTermCare + m.employmentInsurance;
            const net = m.grossPay - ins - m.incomeTax - m.localIncomeTax;
            return (
              <div key={m.month} className="list-row">
                <span
                  className="icon"
                  style={{ background: 'var(--brand-soft)', fontWeight: 700, fontSize: 13 }}
                >
                  {m.month}
                </span>
                <div className="text">
                  <div className="primary">{wonCompact(m.grossPay)}</div>
                  <div className="secondary">
                    실수령 {wonCompact(net)} · 공제 {wonCompact(ins + m.incomeTax + m.localIncomeTax)}
                  </div>
                </div>
                <div style={{ width: 110 }}>
                  <MoneyInput
                    value={m.grossPay}
                    onChange={(v) => void onUpdateMonth(i, { grossPay: v })}
                    suffix=""
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ 명세서 시트 ============ */}
      <Drawer
        open={sheet === 'paystub'}
        onClose={() => setSheet(null)}
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
            <span style={{ fontSize: 22 }}>📋</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>
                명세서 그대로 옮기기
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                비워두면 자동 계산이 사용돼요
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="btn btn-primary btn-sm"
              style={{ borderRadius: 999 }}
            >
              완료
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 20px 40px' }}>
          <div className="callout info" style={{ marginBottom: 14 }}>
            <span className="ico">💡</span>
            <span>명세서의 공제 항목을 그대로 옮기면 자동 추정값보다 정확해요.</span>
          </div>

          <div className="card">
            <div className="field">
              <label className="field-label">
                월 소득세 (지방세 포함){' '}
                <span className="field-tag success">정확도 ↑</span>
              </label>
              <MoneyInput
                value={incomeTax ?? 0}
                onChange={(v) => setIncomeTax(v > 0 ? v : null)}
                placeholder={String(Math.round(autoTotalTax / 10000))}
              />
              <div className="field-hint">
                명세서의 <strong>소득세 + 지방소득세</strong> 합산. 비워두면 자동 ({won(autoTotalTax)})
              </div>
            </div>

            <div className="field">
              <label className="field-label">국민연금</label>
              <MoneyInput
                value={npOverride ?? 0}
                onChange={(v) => setNpOverride(v > 0 ? v : null)}
                placeholder={String(Math.round(autoIns.nationalPension / 10000))}
              />
            </div>
            <div className="field">
              <label className="field-label">건강보험</label>
              <MoneyInput
                value={hiOverride ?? 0}
                onChange={(v) => setHiOverride(v > 0 ? v : null)}
                placeholder={String(Math.round(autoIns.healthInsurance / 10000))}
              />
            </div>
            <div className="field">
              <label className="field-label">장기요양</label>
              <MoneyInput
                value={ltcOverride ?? 0}
                onChange={(v) => setLtcOverride(v > 0 ? v : null)}
                placeholder={String(Math.round(autoIns.longTermCare / 10000))}
              />
            </div>
            <div className="field">
              <label className="field-label">고용보험</label>
              <MoneyInput
                value={empOverride ?? 0}
                onChange={(v) => setEmpOverride(v > 0 ? v : null)}
                placeholder={String(Math.round(autoIns.employmentInsurance / 10000))}
              />
            </div>
          </div>

          <p
            style={{
              fontSize: 11,
              color: 'var(--ink-soft)',
              textAlign: 'center',
              lineHeight: 1.6,
              marginTop: 20,
            }}
          >
            완료를 누른 뒤 [N~12월에 적용] 버튼을 눌러야 저장돼요.
          </p>
        </div>
      </Drawer>

      {/* ============ 상여금 시트 ============ */}
      <Drawer
        open={sheet === 'bonus'}
        onClose={() => setSheet(null)}
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
            <span style={{ fontSize: 22 }}>🎁</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>상여금</div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                정기 · 성과 · 명절상여 등
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="btn btn-primary btn-sm"
              style={{ borderRadius: 999 }}
            >
              완료
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 20px 40px' }}>
          <BonusEditor />
        </div>
      </Drawer>
    </>
  );
}
