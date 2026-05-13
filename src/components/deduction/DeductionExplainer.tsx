import { useState } from 'react';

export function DeductionExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #d1fae5 100%)',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 22 }}>💡</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
            공제? 소득공제? 세액공제?
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
            {open ? '닫기' : '한 줄로 정리해드릴게요'}
          </div>
        </div>
        <span
          style={{
            color: 'var(--ink-soft)',
            fontSize: 14,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ExplainBlock
            title="공제 = 세금을 줄여주는 혜택"
            body="국가가 정한 항목(부양가족, 카드 사용, 의료비 등)에 해당하면 세금을 깎아줘요. 깎아주는 방식이 두 가지 있어요."
            color="#0f172a"
          />

          <ExplainBlock
            tag="📉 소득공제"
            tagColor="#10b981"
            title="세금 매길 소득 자체를 깎아줘요"
            body="공제액만큼 과세표준이 낮아져서, 거기 곱해지는 세율(예: 15%, 24%)만큼만 절세돼요."
            example="공제 100만원 × 세율 15% = 절세 15만원"
            color="#065f46"
          />

          <ExplainBlock
            tag="🎯 세액공제"
            tagColor="#4f46e5"
            title="이미 계산된 세금에서 직접 빼줘요"
            body="공제액이 곧 절세액. 같은 100만원이어도 소득공제보다 효과가 큰 경우가 많아요."
            example="공제 100만원 = 절세 100만원"
            color="#312e81"
          />

          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6, padding: '4px 0 0' }}>
            <strong>요약:</strong> 같은 금액이라면 일반적으로 <strong>세액공제 &gt; 소득공제</strong>가 유리해요.
            하지만 항목마다 어디에 들어가는지 정해져 있어서 우리가 고를 순 없어요.
            아래에서 각 항목이 어느 쪽인지 확인하세요.
          </div>
        </div>
      )}
    </div>
  );
}

function ExplainBlock({
  tag,
  tagColor,
  title,
  body,
  example,
  color,
}: {
  tag?: string;
  tagColor?: string;
  title: string;
  body: string;
  example?: string;
  color: string;
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: '12px 14px' }}>
      {tag && (
        <span
          style={{
            display: 'inline-block',
            fontSize: 10,
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: 999,
            background: tagColor,
            color: '#fff',
            marginBottom: 6,
          }}
        >
          {tag}
        </span>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{body}</div>
      {example && (
        <div
          style={{
            marginTop: 6,
            padding: '6px 10px',
            background: 'rgba(15,23,42,0.04)',
            borderRadius: 8,
            fontSize: 11,
            color: '#0f172a',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          예) {example}
        </div>
      )}
    </div>
  );
}
