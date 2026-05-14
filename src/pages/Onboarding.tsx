import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as AntApp } from 'antd';
import { useAuthStore } from '@/store/authStore';
import { useYearStore } from '@/store/yearStore';
import { useDataStore } from '@/store/dataStore';
import { getTaxRules } from '@/data/tax-rules';
import { buildMonthlyFromGross, computeInsuranceFromGross, estimateMonthlyIncomeTax } from '@/services/salaryService';
import { calculate } from '@/services/taxCalculator';
import { emptyDeductions } from '@/repositories';
import { MoneyInput } from '@/components/common/MoneyInput';
import { won, wonCompact } from '@/utils/format';
import { markOnboardingCompleted } from '@/utils/onboarding';
import type { MonthlySalary } from '@/types';

type Step = 1 | 2;
const TOTAL_STEPS = 2;

export function OnboardingPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.currentProfile);
  const updateCurrent = useAuthStore((s) => s.updateCurrent);
  const year = useYearStore((s) => s.year);
  const data = useDataStore((s) => s.data);
  const loadData = useDataStore((s) => s.load);
  const applyRaiseFrom = useDataStore((s) => s.applyRaiseFrom);
  const { message } = AntApp.useApp();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — birth year (age bracket)
  const [birthYear, setBirthYear] = useState<number | undefined>(undefined);

  // Step 2 — payslip
  const [gross, setGross] = useState(3500000);
  const [meal, setMeal] = useState(200000);
  const [incomeTax, setIncomeTax] = useState<number | null>(null); // null = auto
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (profile) void loadData(profile.key, year);
  }, [profile, year, loadData]);

  // Prefill from existing profile/data
  useEffect(() => {
    if (profile?.birthYear) setBirthYear(profile.birthYear);
  }, [profile]);

  useEffect(() => {
    if (!data) return;
    const firstSalary = data.salaries.find((s) => s.grossPay > 0);
    if (firstSalary) {
      setGross(firstSalary.grossPay);
      setMeal(firstSalary.nonTaxable);
      // 저장된 incomeTax + localIncomeTax 합을 "지방세 포함" 입력값으로 복원
      const savedTotal = firstSalary.incomeTax + firstSalary.localIncomeTax;
      if (savedTotal > 0) setIncomeTax(savedTotal);
    }
  }, [data]);

  if (!profile) return null;

  const onSkip = () => {
    markOnboardingCompleted(profile.key);
    navigate('/', { replace: true });
  };

  const goNextFromAge = async () => {
    if (birthYear) {
      await updateCurrent({ birthYear });
    }
    setStep(2);
  };

  const finish = async () => {
    if (gross <= 0) {
      message.warning('월 급여를 입력해주세요');
      return;
    }
    const rules = getTaxRules(year);
    const taxableMonthly = Math.max(0, gross - meal);
    const ins = computeInsuranceFromGross(taxableMonthly, rules);
    let tax: number;
    let localTax: number;
    if (incomeTax != null) {
      // 사용자가 "지방세 포함" 금액 입력 — 1:0.1 비율로 분리 저장
      const total = incomeTax;
      tax = Math.round(total / 1.1);
      localTax = total - tax;
    } else {
      tax = estimateMonthlyIncomeTax(taxableMonthly);
      localTax = Math.round(tax * 0.1);
    }
    const salary: MonthlySalary = {
      month: 1,
      grossPay: gross,
      nationalPension: ins.nationalPension,
      healthInsurance: ins.healthInsurance,
      longTermCare: ins.longTermCare,
      employmentInsurance: ins.employmentInsurance,
      incomeTax: tax,
      localIncomeTax: localTax,
      nonTaxable: meal,
    };
    await applyRaiseFrom(1, salary);
    markOnboardingCompleted(profile.key);
    navigate('/', { replace: true });
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-top">
        <div className="onboarding-progress">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`onboarding-dot ${i + 1 === step ? 'active' : ''} ${
                i + 1 < step ? 'done' : ''
              }`}
            />
          ))}
        </div>
        <button type="button" className="onboarding-skip" onClick={onSkip}>
          건너뛰기
        </button>
      </div>

      <div className="onboarding-body">
        {step === 1 && (
          <AgeStep birthYear={birthYear} onChange={setBirthYear} year={year} />
        )}
        {step === 2 && (
          <PayslipStep
            gross={gross}
            setGross={setGross}
            meal={meal}
            setMeal={setMeal}
            incomeTax={incomeTax}
            setIncomeTax={setIncomeTax}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            year={year}
          />
        )}
      </div>

      <div className="onboarding-actions">
        {step > 1 && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 0, paddingLeft: 16, paddingRight: 16 }}
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
          >
            ←
          </button>
        )}
        {step === 1 && (
          <button type="button" className="btn btn-primary btn-block" onClick={goNextFromAge}>
            다음
          </button>
        )}
        {step === 2 && (
          <button type="button" className="btn btn-primary btn-block" onClick={finish}>
            시작하기
          </button>
        )}
      </div>
    </div>
  );
}

function AgeStep({
  birthYear,
  onChange,
  year,
}: {
  birthYear: number | undefined;
  onChange: (y: number | undefined) => void;
  year: number;
}) {
  const decades: Array<{ label: string; from: number; to: number }> = [
    { label: '20대', from: year - 29, to: year - 20 },
    { label: '30대', from: year - 39, to: year - 30 },
    { label: '40대', from: year - 49, to: year - 40 },
    { label: '50대', from: year - 59, to: year - 50 },
    { label: '60대 이상', from: 1900, to: year - 60 },
  ];

  function inRange(y: number | undefined, d: { from: number; to: number }) {
    if (!y) return false;
    return y >= d.from && y <= d.to;
  }

  return (
    <>
      <div className="onboarding-eyebrow">1 / 2 · 나이</div>
      <h1 className="onboarding-title">
        몇 살쯤 되세요?
      </h1>
      <p className="onboarding-sub">
        나이에 따라 받을 수 있는 혜택이 달라요.<br />
        대략적으로만 골라줘도 충분해요. <strong style={{ color: 'var(--ink)' }}>안 골라도 OK</strong>
      </p>

      <div className="quick-chips" style={{ gap: 8 }}>
        {decades.map((d) => {
          const active = inRange(birthYear, d);
          const mid = Math.floor((d.from + d.to) / 2);
          return (
            <button
              key={d.label}
              type="button"
              className={`year-chip ${active ? 'active' : ''}`}
              onClick={() => onChange(active ? undefined : mid)}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      <div className="onboarding-section-title" style={{ marginTop: 24 }}>
        또는 출생년도 직접 입력
      </div>
      <input
        className="input"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="예) 1990"
        value={birthYear ?? ''}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
          onChange(v ? Number(v) : undefined);
        }}
      />

      {birthYear && (
        <div className="onboarding-tip">
          {(() => {
            const age = year - birthYear;
            if (age >= 19 && age <= 34) {
              return (
                <>
                  🎉 <strong>청년 (만 {age}세)</strong> — 청년형 장기펀드, 청년 우대 주택청약,
                  중소기업 청년 소득세 감면 등 더 받을 수 있어요.
                </>
              );
            }
            if (age >= 65) {
              return (
                <>
                  ✨ <strong>경로우대 대상 (만 {age}세)</strong> — 본인 의료비 한도 없이 공제,
                  경로우대 추가 공제가 적용돼요.
                </>
              );
            }
            return <>만 {age}세 — 일반 근로자 기준으로 계산할게요.</>;
          })()}
        </div>
      )}
    </>
  );
}

function PayslipStep({
  gross,
  setGross,
  meal,
  setMeal,
  incomeTax,
  setIncomeTax,
  showAdvanced,
  setShowAdvanced,
  year,
}: {
  gross: number;
  setGross: (n: number) => void;
  meal: number;
  setMeal: (n: number) => void;
  incomeTax: number | null;
  setIncomeTax: (n: number | null) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  year: number;
}) {
  const rules = getTaxRules(year);
  const taxable = Math.max(0, gross - meal);
  const autoTax = useMemo(() => estimateMonthlyIncomeTax(taxable), [taxable]);
  const autoLocalTax = Math.round(autoTax * 0.1);
  const autoTotalTax = autoTax + autoLocalTax; // 자동 추정값 (지방세 포함)
  const ins = useMemo(() => computeInsuranceFromGross(taxable, rules), [taxable, rules]);
  // 입력값/자동값 모두 "지방세 포함" 금액으로 통일해서 표시
  const usedTotalTax = incomeTax ?? autoTotalTax;
  const usedIncomeTax = incomeTax != null ? Math.round(incomeTax / 1.1) : autoTax;
  const usedLocalTax = usedTotalTax - usedIncomeTax;
  const insuranceTotal =
    ins.nationalPension + ins.healthInsurance + ins.longTermCare + ins.employmentInsurance;
  const net = gross - insuranceTotal - usedTotalTax;

  // 공제 0원 가정 시 1년치 결정세액 (= 어차피 내야 할 진짜 세금) 시뮬
  const projection = useMemo(() => {
    if (gross <= 0) return null;
    const monthly = buildMonthlyFromGross(1, gross, rules, meal);
    if (incomeTax != null) {
      // 사용자 입력은 "지방세 포함" — 1:0.1 비율로 분리
      const total = incomeTax;
      monthly.incomeTax = Math.round(total / 1.1);
      monthly.localIncomeTax = total - monthly.incomeTax;
    }
    const salaries: MonthlySalary[] = Array.from({ length: 12 }, (_, i) => ({
      ...monthly,
      month: i + 1,
    }));
    const result = calculate({
      salaries,
      bonuses: [],
      cards: [],
      deductions: emptyDeductions(),
      family: [],
      rules,
    });
    return {
      determined: result.determinedTax,
      prepaid: result.prepaidTax,
      diff: result.refund, // + = 환급, − = 추가납부
      grossYear: result.totalGrossPay,
      taxBase: result.taxBase,
      appliedRate: result.appliedRate,
    };
  }, [gross, meal, incomeTax, rules]);

  return (
    <>
      <div className="onboarding-eyebrow">2 / 2 · 급여명세서</div>
      <h1 className="onboarding-title">
        급여명세서<br />보면서 적어주세요
      </h1>
      <p className="onboarding-sub">
        이 두 개만 있으면 시작할 수 있어요.<br />
        4대보험은 자동으로 계산할게요.
      </p>

      <div className="onboarding-field">
        <label className="field-label">
          월 총 지급액 <span className="field-tag">세전</span>
        </label>
        <MoneyInput value={gross} onChange={setGross} placeholder="350" />
        <div className="field-hint">만원 단위로 입력 (예: 350 → 350만원). 실수령 아님!</div>
      </div>

      <div className="onboarding-field">
        <label className="field-label">
          식대 (비과세) <span className="field-tag">월 20만원 한도</span>
        </label>
        <MoneyInput value={meal} onChange={setMeal} max={200000} placeholder="20" />
        <div className="field-hint">대부분 회사가 식대 20만원이에요. 없으면 0</div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent)',
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 0',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {showAdvanced ? '▲ 소득세 자동 계산 사용' : '▼ 소득세 직접 입력 (선택)'}
      </button>

      {showAdvanced && (
        <div className="onboarding-field">
          <label className="field-label">
            월 소득세 (지방세 포함) <span className="field-tag success">정확도 ↑</span>
          </label>
          <MoneyInput
            value={incomeTax ?? 0}
            onChange={(v) => setIncomeTax(v > 0 ? v : null)}
            placeholder={String(Math.round(autoTotalTax / 10000))}
          />
          <div className="field-hint">
            명세서의 <strong>"소득세" + "지방소득세"</strong> 합산 금액. 비워두면 자동 계산({won(autoTotalTax)})돼요.
          </div>
        </div>
      )}

      {gross > 0 && projection && (
        <>
          {/* 1년치 세금 미리보기 — 대시보드와 동일한 뺄셈식 멘탈 모델 */}
          <div className="onboarding-preview-card">
            <div className="onboarding-preview-eyebrow">
              공제 0원이면 1년치 세금
            </div>

            <div className="prev-calc-row">
              <span className="prev-calc-label">올해 내야 할 세금</span>
              <span className="prev-calc-value">{won(projection.determined)}</span>
            </div>
            <div className="prev-calc-note">
              └ 연봉 {won(projection.grossYear)} ·{' '}
              <strong>{Math.round(projection.appliedRate * 100)}% 구간</strong>{' '}
              (과세표준 {won(projection.taxBase)})
            </div>
            <div className="prev-calc-row">
              <span className="prev-calc-label">매달 미리 내는 세금 합계</span>
              <span className="prev-calc-value">
                <span className="op">−</span> {won(projection.prepaid)}
              </span>
            </div>
            <div className="prev-calc-divider" />
            <div className={`prev-calc-result ${projection.diff >= 0 ? 'good' : 'bad'}`}>
              <span className="prev-calc-result-label">
                {projection.diff >= 0 ? '돌려받을 돈' : '더 내야 할 돈'}
              </span>
              <span className="prev-calc-result-value">
                {won(Math.abs(projection.diff))}
              </span>
            </div>

            <div className="onboarding-preview-footer">
              ↓ 다음 화면에서 <strong>공제 항목을 채우면</strong><br />
              <strong>"올해 내야 할 세금"</strong>이 줄어들어요.
            </div>
          </div>

          <div className="onboarding-preview" style={{ marginTop: 12 }}>
            <div className="preview-row">
              <span>4대보험 (자동)</span>
              <strong>−{wonCompact(insuranceTotal)}</strong>
            </div>
            <div className="preview-row">
              <span>소득세 + 지방세</span>
              <strong>−{wonCompact(usedIncomeTax + usedLocalTax)}</strong>
            </div>
            <div className="preview-row total">
              <span>월 실수령 (추정)</span>
              <strong>{won(net)}</strong>
            </div>
          </div>
        </>
      )}
    </>
  );
}
