import { useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useCalculation } from '@/hooks/useCalculation';
import { FamilyEditor } from '@/components/deduction/FamilyEditor';
import { ExpenseSheet } from '@/components/deduction/ExpenseSheet';
import {
  MEDICAL_CATEGORIES,
  EDUCATION_CATEGORIES,
  DONATION_CATEGORIES,
} from '@/components/deduction/expenseCategories';
import { QuickInputSheet, type QuickInputIntent } from '@/components/dashboard/QuickInputSheet';
import { wonCompact } from '@/utils/format';
import type { ExpenseItem } from '@/types';

type ActiveSheet =
  | { kind: 'quick'; intent: QuickInputIntent }
  | { kind: 'medical' }
  | { kind: 'education' }
  | { kind: 'donation' };

interface DedCardProps {
  icon: string;
  title: string;
  hint: string;
  current: string;
  ratio?: number;
  onClick: () => void;
}

function DedCard({ icon, title, hint, current, ratio, onClick }: DedCardProps) {
  const hasInput = current !== '미입력';
  return (
    <button
      type="button"
      onClick={onClick}
      className="rec-row"
      style={{ alignItems: 'flex-start' }}
    >
      <span className="rec-icon">{icon}</span>
      <div className="rec-text">
        <div className="rec-title">{title}</div>
        <div className="rec-desc">{hint}</div>
        {ratio !== undefined && hasInput && (
          <div
            style={{
              marginTop: 8,
              height: 5,
              background: 'var(--brand-soft)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, ratio * 100)}%`,
                height: '100%',
                background: 'var(--accent)',
              }}
            />
          </div>
        )}
      </div>
      <span
        style={{
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 800,
          color: hasInput ? 'var(--ink)' : 'var(--ink-soft)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {current}
      </span>
      <span style={{ color: 'var(--ink-soft)', marginLeft: 4 }}>›</span>
    </button>
  );
}

function SectionHeader({ children, badge }: { children: React.ReactNode; badge?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: '20px 4px 10px',
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: 'var(--ink)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        {children}
      </h3>
      {badge && (
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600 }}>{badge}</span>
      )}
    </div>
  );
}

export function DeductionInputPage() {
  const data = useDataStore((s) => s.data);
  const saveDeductions = useDataStore((s) => s.saveDeductions);
  const { result } = useCalculation();
  const [activeSheet, setActiveSheet] = useState<ActiveSheet | null>(null);

  if (!data || !result) return null;

  const d = data.deductions;
  const close = () => setActiveSheet(null);

  // 카드 (월 평균 합산)
  const cardMonthSum = data.cards.reduce(
    (s, c) => s + c.creditCard + c.checkCard + c.cashReceipt,
    0,
  );
  const cardMonthlyAvg = Math.round(cardMonthSum / 12);

  // 연금/IRP
  const pensionTotal = d.pensionSaving + d.irp;

  // 의료비/교육비/기부금 — 항목 합산
  const medicalTotal = (d.medicalItems ?? []).reduce((s, i) => s + i.amount, 0) || d.medical;
  const medicalCount = (d.medicalItems ?? []).length;
  const eduTotal = (d.educationItems ?? []).reduce((s, i) => s + i.amount, 0) || d.education;
  const eduCount = (d.educationItems ?? []).length;
  const donationItemsTotal = (d.donationItems ?? []).reduce((s, i) => s + i.amount, 0);
  const donationTotal = donationItemsTotal || d.donationGeneral + d.donationHometown + d.donationPolitical;
  const donationCount = (d.donationItems ?? []).length;

  const onMedicalChange = async (items: ExpenseItem[]) => {
    await saveDeductions({
      ...d,
      medicalItems: items,
      medical: items.reduce((s, i) => s + i.amount, 0),
    });
  };
  const onEducationChange = async (items: ExpenseItem[]) => {
    await saveDeductions({
      ...d,
      educationItems: items,
      education: items.reduce((s, i) => s + i.amount, 0),
    });
  };
  const onDonationChange = async (items: ExpenseItem[]) => {
    const sumBy = (pred: (c: string) => boolean) =>
      items.filter((i) => pred(i.category)).reduce((s, i) => s + i.amount, 0);
    await saveDeductions({
      ...d,
      donationItems: items,
      donationHometown: sumBy((c) => c === 'hometown'),
      donationPolitical: sumBy((c) => c === 'political'),
      donationGeneral: sumBy((c) => c !== 'hometown' && c !== 'political'),
    });
  };

  const toggleSingleParent = (checked: boolean) => {
    void saveDeductions({ ...d, isSingleParent: checked });
  };

  const toggleFemaleWorker = (checked: boolean) => {
    void saveDeductions({ ...d, isFemaleWorker: checked });
  };

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">정산 항목</h1>
        <p className="page-subtitle">항목을 눌러서 입력해주세요. 자동 저장돼요.</p>
      </div>

      <SectionHeader>📉 소득공제</SectionHeader>
      <div className="card">
        <DedCard
          icon="💳"
          title="카드 · 현금영수증"
          hint="체크·현금이 더 유리해요"
          current={cardMonthSum > 0 ? `월 평균 ${wonCompact(cardMonthlyAvg)}` : '미입력'}
          onClick={() => setActiveSheet({ kind: 'quick', intent: 'card' })}
        />
        <DedCard
          icon="🏠"
          title="주택청약저축"
          hint="무주택 세대주 대상"
          current={d.housingSaving > 0 ? wonCompact(d.housingSaving) : '미입력'}
          ratio={d.housingSaving / 3_000_000}
          onClick={() => setActiveSheet({ kind: 'quick', intent: 'housing' })}
        />
      </div>

      <SectionHeader>🎯 세액공제</SectionHeader>
      <div className="card">
        <DedCard
          icon="💰"
          title="연금저축 · IRP"
          hint="노후 준비하며 세액공제"
          current={pensionTotal > 0 ? wonCompact(pensionTotal) : '미입력'}
          ratio={pensionTotal / 9_000_000}
          onClick={() => setActiveSheet({ kind: 'quick', intent: 'pension' })}
        />
        <DedCard
          icon="🏥"
          title="의료비"
          hint="병원·약국·치과 영수증"
          current={medicalTotal > 0 ? `${wonCompact(medicalTotal)} · ${medicalCount}건` : '미입력'}
          onClick={() => setActiveSheet({ kind: 'medical' })}
        />
        <DedCard
          icon="📚"
          title="교육비"
          hint="본인·자녀 학비"
          current={eduTotal > 0 ? `${wonCompact(eduTotal)} · ${eduCount}건` : '미입력'}
          onClick={() => setActiveSheet({ kind: 'education' })}
        />
        <DedCard
          icon="🎁"
          title="기부금"
          hint="종교·구호·고향사랑"
          current={donationTotal > 0 ? `${wonCompact(donationTotal)} · ${donationCount}건` : '미입력'}
          onClick={() => setActiveSheet({ kind: 'donation' })}
        />
        <DedCard
          icon="🏘️"
          title="월세"
          hint="무주택 세대주 월세"
          current={d.monthlyRent > 0 ? wonCompact(d.monthlyRent) : '미입력'}
          ratio={d.monthlyRent / 10_000_000}
          onClick={() => setActiveSheet({ kind: 'quick', intent: 'rent' })}
        />
        <DedCard
          icon="🛡️"
          title="보장성 보험료"
          hint="실손·생명·상해 보험"
          current={d.insurance > 0 ? wonCompact(d.insurance) : '미입력'}
          ratio={d.insurance / 1_000_000}
          onClick={() => setActiveSheet({ kind: 'quick', intent: 'insurance' })}
        />
      </div>

      <SectionHeader badge={data.family.length > 0 ? `${data.family.length}명` : undefined}>
        👨‍👩‍👧 가족
      </SectionHeader>
      <FamilyEditor />

      <div className="card" style={{ marginTop: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
          <span className="rec-icon">👤</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>한부모 공제</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
              100만원 추가 공제
            </div>
          </div>
          <input
            type="checkbox"
            checked={d.isSingleParent}
            onChange={(e) => toggleSingleParent(e.target.checked)}
            style={{ width: 22, height: 22, accentColor: '#0a0a0a' }}
          />
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 0',
            borderTop: '1px solid var(--line)',
            marginTop: 4,
            paddingTop: 12,
          }}
        >
          <span className="rec-icon">👩</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>부녀자 공제</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
              종합소득 3천만 이하 여성 · 50만원
              {d.isSingleParent && ' · 한부모와 중복 불가'}
            </div>
          </div>
          <input
            type="checkbox"
            checked={!!d.isFemaleWorker}
            disabled={d.isSingleParent}
            onChange={(e) => toggleFemaleWorker(e.target.checked)}
            style={{ width: 22, height: 22, accentColor: '#0a0a0a', opacity: d.isSingleParent ? 0.4 : 1 }}
          />
        </label>
      </div>

      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--ink-soft)',
          margin: '20px 0 8px',
          lineHeight: 1.6,
        }}
      >
        ⚠️ 본 결과는 추정치예요. 실제 홈택스와 차이가 있을 수 있어요.
      </p>

      <QuickInputSheet
        open={activeSheet?.kind === 'quick'}
        intent={activeSheet?.kind === 'quick' ? activeSheet.intent : null}
        onClose={close}
      />
      <ExpenseSheet
        open={activeSheet?.kind === 'medical'}
        onClose={close}
        title="의료비 영수증"
        emoji="🏥"
        description="병원·약국·치과 영수증"
        categories={MEDICAL_CATEGORIES}
        items={d.medicalItems ?? []}
        onChange={onMedicalChange}
      />
      <ExpenseSheet
        open={activeSheet?.kind === 'education'}
        onClose={close}
        title="교육비"
        emoji="📚"
        description="본인·자녀 학비"
        categories={EDUCATION_CATEGORIES}
        items={d.educationItems ?? []}
        onChange={onEducationChange}
      />
      <ExpenseSheet
        open={activeSheet?.kind === 'donation'}
        onClose={close}
        title="기부금"
        emoji="🎁"
        description="종교·구호·고향사랑"
        categories={DONATION_CATEGORIES}
        items={d.donationItems ?? []}
        onChange={onDonationChange}
      />
    </>
  );
}
