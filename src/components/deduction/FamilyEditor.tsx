import { useDataStore } from '@/store/dataStore';
import type { FamilyMember } from '@/types';

const RELATION_OPTIONS: Array<{ value: FamilyMember['relation']; label: string; icon: string }> = [
  { value: 'spouse', label: '배우자', icon: '💑' },
  { value: 'child', label: '자녀', icon: '👶' },
  { value: 'parent', label: '부모/조부모', icon: '👴' },
  { value: 'sibling', label: '형제자매', icon: '👫' },
  { value: 'other', label: '기타', icon: '👤' },
];

function randomId() {
  return Math.random().toString(36).slice(2, 9);
}

export function FamilyEditor() {
  const data = useDataStore((s) => s.data);
  const saveFamily = useDataStore((s) => s.saveFamily);

  if (!data) return null;

  const update = (id: string, patch: Partial<FamilyMember>) => {
    const next = data.family.map((f) => (f.id === id ? { ...f, ...patch } : f));
    void saveFamily(next);
  };

  const remove = (id: string) => {
    void saveFamily(data.family.filter((f) => f.id !== id));
  };

  const add = (relation: FamilyMember['relation']) => {
    const member: FamilyMember = {
      id: randomId(),
      name:
        relation === 'child'
          ? `자녀${data.family.filter((f) => f.relation === 'child').length + 1}`
          : '',
      relation,
      isElderly: relation === 'parent',
      isDisabled: false,
      hasIncome: false,
    };
    void saveFamily([...data.family, member]);
  };

  return (
    <>
      <div className="card">
        <h3 className="card-title">부양가족</h3>
        <div className="card-subtle">소득이 없는 부양가족만 기본공제 대상</div>

        {data.family.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)', fontSize: 13 }}>
            아직 등록된 가족이 없어요
          </div>
        ) : (
          data.family.map((f) => {
            const info = RELATION_OPTIONS.find((r) => r.value === f.relation) ?? RELATION_OPTIONS[4];
            // 같은 관계가 여러 명일 때 #번호 표시 (자녀 1, 자녀 2 등)
            const sameRelation = data.family.filter((x) => x.relation === f.relation);
            const idx = sameRelation.findIndex((x) => x.id === f.id) + 1;
            const showIndex = sameRelation.length > 1;
            return (
              <div key={f.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span className="icon" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand-soft)', display: 'grid', placeItems: 'center', fontSize: 18 }}>
                    {info.icon}
                  </span>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    {info.label}
                    {showIndex && <span style={{ color: 'var(--ink-soft)', marginLeft: 6, fontWeight: 600 }}>#{idx}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}
                  >
                    삭제
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'isElderly', label: '경로 (70+)' },
                    { key: 'isDisabled', label: '장애' },
                    { key: 'hasIncome', label: '소득 있음' },
                  ].map((opt) => {
                    const active = (f as any)[opt.key] as boolean;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => update(f.id, { [opt.key]: !active } as any)}
                        className={`year-chip ${active ? 'active' : ''}`}
                        style={{ fontSize: 11, padding: '6px 12px' }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 14 }}>
          {RELATION_OPTIONS.slice(0, 4).map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => add(r.value)}
              className="btn btn-secondary"
              style={{ height: 40, fontSize: 12, flexDirection: 'column', gap: 2, padding: '4px 0' }}
            >
              <span style={{ fontSize: 16 }}>{r.icon}</span>
              <span style={{ fontSize: 10 }}>+ {r.label.split('/')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
