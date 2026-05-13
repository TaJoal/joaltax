import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataStore } from '@/store/dataStore';
import { useCalculation } from '@/hooks/useCalculation';
import type { MonthlyCardSpending, Deductions } from '@/types';
import { won, wonCompact } from '@/utils/format';
import { MoneyInput } from '@/components/common/MoneyInput';
import { Segmented } from '@/components/common/Segmented';
import { FamilyEditor } from '@/components/deduction/FamilyEditor';
import { CardLimitsPanel } from '@/components/deduction/CardLimitsPanel';
import { MonthlyCardEditor } from '@/components/deduction/MonthlyCardEditor';
import { DeductionExplainer } from '@/components/deduction/DeductionExplainer';
import { ExpenseSheet } from '@/components/deduction/ExpenseSheet';
import { MEDICAL_CATEGORIES, EDUCATION_CATEGORIES, DONATION_CATEGORIES } from '@/components/deduction/expenseCategories';
import type { ExpenseItem } from '@/types';

type Tab = 'income' | 'credit' | 'family';
const VALID_TABS: Tab[] = ['income', 'credit', 'family'];

/** Map old URL params for backward compat (from earlier tab structure) */
const LEGACY_TAB_MAP: Record<string, Tab> = {
  card: 'income',
  others: 'credit',
};

const CARD_FIELDS: Array<{ key: keyof Omit<MonthlyCardSpending, 'month'>; label: string; hint: string; icon: string }> = [
  { key: 'creditCard', label: '신용카드', hint: '공제율 15%', icon: '💳' },
  { key: 'checkCard', label: '체크카드', hint: '공제율 30%', icon: '💰' },
  { key: 'cashReceipt', label: '현금영수증', hint: '공제율 30%', icon: '🧾' },
  { key: 'traditionalMarket', label: '전통시장', hint: '40%, 별도 한도', icon: '🛒' },
  { key: 'publicTransport', label: '대중교통', hint: '40%, 별도 한도', icon: '🚌' },
  { key: 'books', label: '도서·공연', hint: '30%, 별도 한도', icon: '📚' },
];

interface OtherField {
  key: keyof Deductions;
  label: string;
  hint: string;
  icon: string;
  /** 'income' = 소득공제, 'credit' = 세액공제 */
  type: 'income' | 'credit';
  limit?: number;
  limitLabel?: string;
  group?: 'pension';
}

const OTHER_FIELDS: OtherField[] = [
  { key: 'housingSaving', label: '주택청약', hint: '납입액의 40%를 과세표준에서 차감 · 총급여 7천만 이하만', icon: '🏠', type: 'income', limit: 3000000, limitLabel: '연 300만원' },
  { key: 'medical', label: '의료비', hint: '총급여 3% 초과분의 15%를 세금에서 차감', icon: '🏥', type: 'credit' },
  { key: 'education', label: '교육비', hint: '납입액의 15%를 세금에서 차감', icon: '🎓', type: 'credit' },
  // 기부금은 일반 + 고향사랑이 단일 popup 행으로 통합됨 (donationGeneral key를 placeholder로 사용)
  { key: 'donationGeneral', label: '기부금', hint: '고향사랑·종교·사회복지·문화 등', icon: '🎁', type: 'credit' },
  { key: 'pensionSaving', label: '연금저축', hint: '15% 세액공제 (총급여 5,500만 초과 시 12%)', icon: '💼', type: 'credit', limit: 6000000, limitLabel: '연 600만원', group: 'pension' },
  { key: 'irp', label: 'IRP', hint: '연금저축과 합산 900만원 한도', icon: '🏦', type: 'credit', limit: 9000000, limitLabel: '합산 900만원', group: 'pension' },
  { key: 'monthlyRent', label: '월세', hint: '15~17% 세액공제 · 총급여 8천만 이하', icon: '🔑', type: 'credit', limit: 10000000, limitLabel: '연 1천만원' },
  { key: 'insurance', label: '보장성 보험료', hint: '12% 세액공제', icon: '🛡️', type: 'credit', limit: 1000000, limitLabel: '연 100만원' },
];

const HOUSING_FIELD = OTHER_FIELDS.find((f) => f.key === 'housingSaving')!;
const CREDIT_FIELDS = OTHER_FIELDS.filter((f) => f.type === 'credit');

export function DeductionInputPage() {
  const data = useDataStore((s) => s.data);
  const saveCards = useDataStore((s) => s.saveCards);
  const saveDeductions = useDataStore((s) => s.saveDeductions);
  const { cardGuide, cardBreakdown, forecast, rules } = useCalculation();
  const [cardMode, setCardMode] = useState<'bulk' | 'monthly'>('bulk');
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (() => {
    const raw = searchParams.get('tab');
    if (raw && VALID_TABS.includes(raw as Tab)) return raw as Tab;
    if (raw && LEGACY_TAB_MAP[raw]) return LEGACY_TAB_MAP[raw];
    return 'income';
  })();
  const [tab, setTabState] = useState<Tab>(initialTab);
  const setTab = (t: Tab) => {
    setTabState(t);
    setSearchParams({ tab: t }, { replace: true });
  };

  const [bulk, setBulk] = useState<Record<keyof Omit<MonthlyCardSpending, 'month'>, number>>({
    creditCard: 0,
    checkCard: 0,
    cashReceipt: 0,
    traditionalMarket: 0,
    publicTransport: 0,
    books: 0,
  });
  const [deductionForm, setDeductionForm] = useState<Deductions | null>(null);
  const [sheet, setSheet] = useState<'medical' | 'education' | 'donation' | null>(null);

  // 사용자 변경분만 자동저장하고, 외부(store) 변경은 무시하기 위한 플래그
  const userEditedRef = useRef(false);
  const bulkEditedRef = useRef(false);

  useEffect(() => {
    if (data) setDeductionForm(data.deductions);
  }, [data]);

  // 카드 일괄 입력값이 바뀌면 디바운스 후 12개월 자동 적용
  useEffect(() => {
    if (!data || !bulkEditedRef.current) return;
    const t = window.setTimeout(() => {
      const next: MonthlyCardSpending[] = data.cards.map((c) => ({ month: c.month, ...bulk }));
      void saveCards(next);
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulk]);

  // 공제 입력값(주택청약, 보험, 한부모 등)이 바뀌면 디바운스 후 자동저장
  useEffect(() => {
    if (!deductionForm || !userEditedRef.current) return;
    const t = window.setTimeout(() => {
      void saveDeductions(deductionForm);
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deductionForm]);

  if (!data || !deductionForm) return null;

  /** 사용자 편집 표시 + state 업데이트 헬퍼 */
  const editDeductionForm = (next: Deductions) => {
    userEditedRef.current = true;
    setDeductionForm(next);
  };
  const editBulk = (next: typeof bulk) => {
    bulkEditedRef.current = true;
    setBulk(next);
  };

  const updateMedicalItems = async (items: ExpenseItem[]) => {
    const next: Deductions = {
      ...deductionForm,
      medicalItems: items,
      medical: items.reduce((s, i) => s + i.amount, 0),
    };
    setDeductionForm(next);
    await saveDeductions(next);
  };

  const updateEducationItems = async (items: ExpenseItem[]) => {
    const next: Deductions = {
      ...deductionForm,
      educationItems: items,
      education: items.reduce((s, i) => s + i.amount, 0),
    };
    setDeductionForm(next);
    await saveDeductions(next);
  };

  const medicalItems = deductionForm.medicalItems ?? [];
  const educationItems = deductionForm.educationItems ?? [];
  const donationItems = deductionForm.donationItems ?? [];

  const updateDonationItems = async (items: ExpenseItem[]) => {
    const hometown = items.filter((i) => i.category === 'hometown').reduce((s, i) => s + i.amount, 0);
    const general = items.filter((i) => i.category !== 'hometown').reduce((s, i) => s + i.amount, 0);
    const next: Deductions = {
      ...deductionForm,
      donationItems: items,
      donationHometown: hometown,
      donationGeneral: general,
    };
    setDeductionForm(next);
    await saveDeductions(next);
  };

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">지출 / 공제</h1>
        <p className="page-subtitle">공제 유형별로 입력해주세요</p>
      </div>

      <DeductionExplainer />

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'income', label: '📉 소득공제' },
          { value: 'credit', label: '🎯 세액공제' },
          { value: 'family', label: '👨‍👩‍👧 가족' },
        ]}
      />

      {tab === 'income' && (
        <>
          <div className="callout success" style={{ marginBottom: 12 }}>
            <span className="ico">📉</span>
            <span>
              <strong>소득공제</strong>는 세금을 매길 소득 자체를 깎아줘요. 카드 사용 · 주택청약 · 한부모공제가 여기에 속해요.
            </span>
          </div>

          {/* 카드 섹션 */}
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-muted)', margin: '4px 4px 8px' }}>
            💳 카드 / 현금영수증
          </div>

          {cardBreakdown && <CardLimitsPanel breakdown={cardBreakdown} rules={rules} />}

          {cardGuide && (
            <div className={`callout ${cardGuide.level === 'warning' ? 'warn' : cardGuide.level}`}>
              <span className="ico">💡</span>
              <span>{cardGuide.message}</span>
            </div>
          )}

          <Segmented<'bulk' | 'monthly'>
            value={cardMode}
            onChange={setCardMode}
            items={[
              { value: 'bulk', label: '월평균 일괄' },
              { value: 'monthly', label: '월별 입력' },
            ]}
          />

          {cardMode === 'bulk' && (
            <div className="card">
              <h3 className="card-title">월평균 일괄 입력</h3>
              <div className="card-subtle">입력하면 1~12월 동일 금액으로 적용됩니다</div>
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
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{f.hint}</div>
                  </div>
                  <div style={{ width: 130 }}>
                    <MoneyInput value={bulk[f.key]} onChange={(v) => editBulk({ ...bulk, [f.key]: v })} suffix="" />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 12, textAlign: 'center' }}>
                입력하면 1~12월에 자동 적용돼요
              </div>
            </div>
          )}

          {cardMode === 'monthly' && <MonthlyCardEditor />}

          {forecast && forecast.filledMonths > 0 && forecast.filledMonths < 12 && (
            <div className="card">
              <h3 className="card-title">📈 연말까지 예측</h3>
              <div className="card-subtle">
                {forecast.filledMonths}개월 평균으로 나머지 {12 - forecast.filledMonths}개월 추정
              </div>
              <div className="stat-row">
                <span className="label">연말 예상 공제액</span>
                <span className="value">{won(forecast.projectedDeduction)}</span>
              </div>
              {forecast.scenarioCheckCard.extraTaxSave > 0 && (
                <div className="stat-row result">
                  <span className="label">💡 체크카드 월 50만 추가 시</span>
                  <span className="value">+{won(forecast.scenarioCheckCard.extraTaxSave)}</span>
                </div>
              )}
            </div>
          )}

          {/* 주택청약 섹션 */}
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-muted)', margin: '16px 4px 8px' }}>
            🏠 그 외 소득공제
          </div>
          <DeductionRow
            field={HOUSING_FIELD}
            value={deductionForm.housingSaving}
            onChange={(v) => editDeductionForm({ ...deductionForm, housingSaving: v })}
          />
        </>
      )}

      {tab === 'credit' && (
        <>
          <div className="callout info" style={{ marginBottom: 12 }}>
            <span className="ico">🎯</span>
            <span>
              <strong>세액공제</strong>는 이미 계산된 세금에서 직접 빼줘요. 공제액이 곧 절세액이에요.
            </span>
          </div>

          {CREDIT_FIELDS.map((f) => {
            if (f.key === 'medical') {
              return (
                <ExpenseRowSummary
                  key={f.key}
                  icon={f.icon}
                  label={f.label}
                  hint="항목별 입력 (병원·약국·치과 등)"
                  items={medicalItems}
                  fallbackTotal={deductionForm.medical}
                  onClick={() => setSheet('medical')}
                />
              );
            }
            if (f.key === 'education') {
              return (
                <ExpenseRowSummary
                  key={f.key}
                  icon={f.icon}
                  label={f.label}
                  hint="항목별 입력 (본인·자녀 학교·학원 등)"
                  items={educationItems}
                  fallbackTotal={deductionForm.education}
                  onClick={() => setSheet('education')}
                />
              );
            }
            if (f.key === 'donationGeneral') {
              const donationTotal = donationItems.length > 0
                ? donationItems.reduce((s, i) => s + i.amount, 0)
                : deductionForm.donationGeneral + deductionForm.donationHometown;
              return (
                <ExpenseRowSummary
                  key={f.key}
                  icon={f.icon}
                  label="기부금"
                  hint="고향사랑·종교·사회복지 등"
                  items={donationItems}
                  fallbackTotal={donationTotal}
                  onClick={() => setSheet('donation')}
                />
              );
            }
            return (
              <DeductionRow
                key={f.key}
                field={f}
                value={(deductionForm as any)[f.key] as number}
                onChange={(v) => editDeductionForm({ ...deductionForm, [f.key]: v } as Deductions)}
                combinedPensionValue={
                  f.group === 'pension'
                    ? (deductionForm.pensionSaving || 0) + (deductionForm.irp || 0)
                    : undefined
                }
              />
            );
          })}
        </>
      )}

      {tab === 'family' && (
        <>
          <FamilyEditor />

          <div className="card">
            <h3 className="card-title">기타 상태</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              <span className="icon" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-soft)', display: 'grid', placeItems: 'center', fontSize: 16 }}>
                👤
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  한부모 공제{' '}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#d1fae5', color: '#065f46', marginLeft: 4 }}>
                    📉 소득공제
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>해당 시 100만원 추가 공제</div>
              </div>
              <input
                type="checkbox"
                checked={deductionForm.isSingleParent}
                onChange={(e) => editDeductionForm({ ...deductionForm, isSingleParent: e.target.checked })}
                style={{ width: 22, height: 22, accentColor: '#0a0a0a' }}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          연간 카드 사용액 합계: {wonCompact(cardBreakdown?.totalUsage ?? 0)}
        </span>
      </div>

      <ExpenseSheet
        open={sheet === 'medical'}
        onClose={() => setSheet(null)}
        title="의료비 항목"
        emoji="🏥"
        description="병원·약국·치과 등 항목별로 입력해주세요"
        categories={MEDICAL_CATEGORIES}
        items={medicalItems}
        onChange={updateMedicalItems}
      />
      <ExpenseSheet
        open={sheet === 'education'}
        onClose={() => setSheet(null)}
        title="교육비 항목"
        emoji="🎓"
        description="대상자와 교육 단계에 따라 한도가 달라요"
        categories={EDUCATION_CATEGORIES}
        items={educationItems}
        onChange={updateEducationItems}
      />
      <ExpenseSheet
        open={sheet === 'donation'}
        onClose={() => setSheet(null)}
        title="기부금 항목"
        emoji="🎁"
        description="고향사랑은 별도 공제식, 나머지는 합산해서 15%(초과 30%)"
        categories={DONATION_CATEGORIES}
        items={donationItems}
        onChange={updateDonationItems}
      />
    </>
  );
}

function ExpenseRowSummary({
  icon,
  label,
  hint,
  items,
  fallbackTotal,
  onClick,
}: {
  icon: string;
  label: string;
  hint: string;
  items: ExpenseItem[];
  fallbackTotal: number;
  onClick: () => void;
}) {
  const total = items.length > 0 ? items.reduce((s, i) => s + i.amount, 0) : fallbackTotal;

  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{
        width: '100%',
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 20,
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--brand-soft)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {label}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 6,
              background: '#eef2ff',
              color: '#3730a3',
              marginLeft: 6,
            }}
          >
            항목별
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{hint}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {total > 0 ? wonCompact(total) : '입력 안 됨'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
          {items.length > 0 ? `${items.length}건` : '탭하여 추가'}
        </div>
      </div>
      <span style={{ color: 'var(--ink-soft)', fontSize: 18, marginLeft: 4 }}>›</span>
    </button>
  );
}

function DeductionRow({
  field,
  value,
  onChange,
  combinedPensionValue,
}: {
  field: OtherField;
  value: number;
  onChange: (v: number) => void;
  combinedPensionValue?: number;
}) {
  let limit = field.limit;
  let limitCurrent = value;
  if (field.group === 'pension' && field.key === 'irp' && combinedPensionValue !== undefined) {
    limit = 9000000;
    limitCurrent = combinedPensionValue;
  }
  const pct = limit && limit > 0 ? Math.min(100, (limitCurrent / limit) * 100) : 0;
  const isAtCap = pct >= 100;
  const remaining = limit ? Math.max(0, limit - limitCurrent) : 0;

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          {field.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{field.label}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{field.hint}</div>
        </div>
        <div style={{ width: 130 }}>
          <MoneyInput value={value} onChange={onChange} suffix="" />
        </div>
      </div>
      {limit && (
        <div style={{ marginTop: 10, marginLeft: 46 }}>
          <div className="progress-track" style={{ height: 4 }}>
            <div
              className="progress-bar"
              style={{
                width: `${pct}%`,
                background: isAtCap ? '#10b981' : pct >= 80 ? '#4f46e5' : '#94a3b8',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
              {field.limitLabel} 한도 · {pct.toFixed(0)}%
            </span>
            <span style={{ fontSize: 10, color: isAtCap ? '#10b981' : 'var(--ink-soft)', fontWeight: 600 }}>
              {isAtCap ? '✓ 한도 도달' : `${wonCompact(remaining)} 여유`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
