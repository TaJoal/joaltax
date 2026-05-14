import { useEffect, useMemo, useState } from 'react';
import { App as AntApp } from 'antd';
import { useDataStore } from '@/store/dataStore';
import { useYearStore } from '@/store/yearStore';
import { getTaxRules } from '@/data/tax-rules';
import { computeInsuranceFromGross, estimateMonthlyIncomeTax } from '@/services/salaryService';
import { won, wonCompact } from '@/utils/format';
import type { MonthlySalary } from '@/types';
import { MoneyInput } from '@/components/common/MoneyInput';
import { Segmented } from '@/components/common/Segmented';
import { BonusEditor } from '@/components/salary/BonusEditor';

type Tab = 'quick' | 'bonus' | 'monthly';

export function SalaryInputPage() {
  const data = useDataStore((s) => s.data);
  const applyRaiseFrom = useDataStore((s) => s.applyRaiseFrom);
  const saveSalaries = useDataStore((s) => s.saveSalaries);
  const year = useYearStore((s) => s.year);
  const rules = getTaxRules(year);
  const { message } = AntApp.useApp();

  const [tab, setTab] = useState<Tab>('quick');
  const [gross, setGross] = useState<number>(3500000);
  const [fromMonth, setFromMonth] = useState<number>(1);
  const [nonTaxable, setNonTaxable] = useState<number>(200000);
  const [incomeTax, setIncomeTax] = useState<number | null>(null);
  const [showIncomeTaxInput, setShowIncomeTaxInput] = useState(false);
  // 4대보험 직접 입력 (null = 자동)
  const [npOverride, setNpOverride] = useState<number | null>(null);
  const [hiOverride, setHiOverride] = useState<number | null>(null);
  const [ltcOverride, setLtcOverride] = useState<number | null>(null);
  const [empOverride, setEmpOverride] = useState<number | null>(null);
  const [showInsuranceInput, setShowInsuranceInput] = useState(false);

  useEffect(() => {
    if (data && data.salaries[0]?.grossPay > 0) {
      const first = data.salaries[0];
      setGross(first.grossPay);
      setNonTaxable(first.nonTaxable);
      // 기존 저장 소득세가 자동값과 다르면 사용자 직접 입력으로 간주
      const t = Math.max(0, first.grossPay - first.nonTaxable);
      const autoIT = estimateMonthlyIncomeTax(t);
      const autoTotal = autoIT + Math.round(autoIT * 0.1);
      const savedTotal = first.incomeTax + first.localIncomeTax;
      // 저장 합계가 자동 추정값과 다르면 사용자 직접 입력으로 간주 (지방세 포함 합계)
      if (Math.abs(savedTotal - autoTotal) > 1000) {
        setIncomeTax(savedTotal);
        setShowIncomeTaxInput(true);
      }
      // 기존 저장 4대보험이 자동값과 다르면 사용자 직접 입력으로 간주
      const autoIns = computeInsuranceFromGross(t, rules);
      const insChanged =
        Math.abs(first.nationalPension - autoIns.nationalPension) > 1000 ||
        Math.abs(first.healthInsurance - autoIns.healthInsurance) > 1000 ||
        Math.abs(first.longTermCare - autoIns.longTermCare) > 1000 ||
        Math.abs(first.employmentInsurance - autoIns.employmentInsurance) > 1000;
      if (insChanged) {
        setNpOverride(first.nationalPension);
        setHiOverride(first.healthInsurance);
        setLtcOverride(first.longTermCare);
        setEmpOverride(first.employmentInsurance);
        setShowInsuranceInput(true);
      }
    }
  }, [data, rules]);

  const taxable = Math.max(0, gross - nonTaxable);
  const autoTax = useMemo(() => estimateMonthlyIncomeTax(taxable), [taxable]);
  const autoLocalTax = Math.round(autoTax * 0.1);
  const autoTotalTax = autoTax + autoLocalTax;
  const autoIns = useMemo(() => computeInsuranceFromGross(taxable, rules), [taxable, rules]);
  // incomeTax 입력은 "지방세 포함" 합계. 내부 저장은 소득세/지방세 분리.
  const usedTotalTax = incomeTax ?? autoTotalTax;
  const usedTax = incomeTax != null ? Math.round(incomeTax / 1.1) : autoTax;
  const usedLocalTax = usedTotalTax - usedTax;
  const usedNp = npOverride ?? autoIns.nationalPension;
  const usedHi = hiOverride ?? autoIns.healthInsurance;
  const usedLtc = ltcOverride ?? autoIns.longTermCare;
  const usedEmp = empOverride ?? autoIns.employmentInsurance;

  const preview = useMemo<MonthlySalary>(() => ({
    month: fromMonth,
    grossPay: gross,
    nonTaxable,
    nationalPension: usedNp,
    healthInsurance: usedHi,
    longTermCare: usedLtc,
    employmentInsurance: usedEmp,
    incomeTax: usedTax,
    localIncomeTax: usedLocalTax,
  }), [fromMonth, gross, nonTaxable, usedNp, usedHi, usedLtc, usedEmp, usedTax, usedLocalTax]);

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
          { value: 'bonus', label: '상여' },
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

            <button
              type="button"
              onClick={() => setShowIncomeTaxInput((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 13,
                fontWeight: 600,
                padding: '4px 0 8px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              {showIncomeTaxInput ? '▲ 소득세 자동 계산 사용' : '▼ 소득세 직접 입력 (정확도 ↑)'}
            </button>

            {showIncomeTaxInput && (
              <div className="field">
                <label className="field-label">
                  월 소득세 (지방세 포함) <span className="field-tag success">정확도 ↑</span>
                </label>
                <MoneyInput
                  value={incomeTax ?? 0}
                  onChange={(v) => setIncomeTax(v > 0 ? v : null)}
                  placeholder={String(Math.round(autoTotalTax / 10000))}
                />
                <div className="field-hint">
                  명세서의 <strong>"소득세" + "지방소득세"</strong> 합산 금액. 비워두면 자동 계산({won(autoTotalTax)}) 사용.
                </div>
              </div>
            )}

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
            <button
              type="button"
              onClick={() => setShowInsuranceInput((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 13,
                fontWeight: 600,
                padding: '4px 0 8px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              {showInsuranceInput ? '▲ 4대보험 자동 계산 사용' : '▼ 4대보험 직접 입력 (정확도 ↑)'}
            </button>

            {showInsuranceInput && (
              <>
                <div className="field-hint" style={{ marginBottom: 8 }}>
                  명세서의 각 보험료 항목 그대로. 회사·산재 가입 형태에 따라 다를 수 있어요. 비워두면 자동 계산.
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
              </>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">월 공제 미리보기</h3>
            <div className="stat-row">
              <span className="label">
                국민연금 {npOverride != null && <span className="field-tag success" style={{ marginLeft: 4 }}>직접</span>}
              </span>
              <span className="value">{won(usedNp)}</span>
            </div>
            <div className="stat-row">
              <span className="label">
                건강보험 {hiOverride != null && <span className="field-tag success" style={{ marginLeft: 4 }}>직접</span>}
              </span>
              <span className="value">{won(usedHi)}</span>
            </div>
            <div className="stat-row">
              <span className="label">
                장기요양 {ltcOverride != null && <span className="field-tag success" style={{ marginLeft: 4 }}>직접</span>}
              </span>
              <span className="value">{won(usedLtc)}</span>
            </div>
            <div className="stat-row">
              <span className="label">
                고용보험 {empOverride != null && <span className="field-tag success" style={{ marginLeft: 4 }}>직접</span>}
              </span>
              <span className="value">{won(usedEmp)}</span>
            </div>
            <div className="stat-row">
              <span className="label">
                소득세 {incomeTax != null && <span className="field-tag success" style={{ marginLeft: 4 }}>직접</span>}
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

      {tab === 'bonus' && <BonusEditor />}

      {tab === 'monthly' && (
        <div className="card">
          <h3 className="card-title">월별 보기 / 수정</h3>
          <div className="card-subtle">연간 총급여 {wonCompact(totalGross)}</div>
          {data.salaries.map((m, i) => {
            const ins = m.nationalPension + m.healthInsurance + m.longTermCare + m.employmentInsurance;
            const net = m.grossPay - ins - m.incomeTax - m.localIncomeTax;
            return (
              <div key={m.month} className="list-row">
                <span className="icon" style={{ background: 'var(--brand-soft)', fontWeight: 700, fontSize: 13 }}>
                  {m.month}
                </span>
                <div className="text">
                  <div className="primary">{wonCompact(m.grossPay)}</div>
                  <div className="secondary">실수령 {wonCompact(net)} · 공제 {wonCompact(ins + m.incomeTax + m.localIncomeTax)}</div>
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
    </>
  );
}
