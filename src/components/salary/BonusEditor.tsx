import { useDataStore } from '@/store/dataStore';
import type { Bonus, BonusType } from '@/types';
import { won, wonCompact } from '@/utils/format';
import { MoneyInput } from '@/components/common/MoneyInput';

const TYPE_OPTIONS: Array<{ value: BonusType; label: string; icon: string }> = [
  { value: 'regular', label: '정기상여', icon: '💼' },
  { value: 'performance', label: '성과급', icon: '🏆' },
  { value: 'holiday', label: '명절상여', icon: '🎁' },
  { value: 'etc', label: '기타', icon: '✨' },
];

function randomId() {
  return Math.random().toString(36).slice(2, 9);
}

export function BonusEditor() {
  const data = useDataStore((s) => s.data);
  const saveBonuses = useDataStore((s) => s.saveBonuses);

  if (!data) return null;

  const update = (id: string, patch: Partial<Bonus>) => {
    const next = data.bonuses.map((b) => (b.id === id ? { ...b, ...patch } : b));
    void saveBonuses(next);
  };
  const remove = (id: string) => {
    void saveBonuses(data.bonuses.filter((b) => b.id !== id));
  };
  const add = () => {
    const newBonus: Bonus = {
      id: randomId(),
      month: 12,
      amount: 1000000,
      type: 'regular',
    };
    void saveBonuses([...data.bonuses, newBonus]);
  };

  const total = data.bonuses.reduce((s, b) => s + b.amount, 0);

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 className="card-title" style={{ margin: 0 }}>상여금</h3>
          <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {wonCompact(total)}
          </span>
        </div>
        <div className="card-subtle">특정 월에 지급된 상여는 총급여에 합산됩니다</div>

        {data.bonuses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)', fontSize: 13 }}>
            아직 등록된 상여가 없어요
          </div>
        ) : (
          data.bonuses.map((b) => {
            const typeInfo = TYPE_OPTIONS.find((t) => t.value === b.type) ?? TYPE_OPTIONS[0];
            return (
              <div key={b.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span className="icon" style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--brand-soft)', display: 'grid', placeItems: 'center', fontSize: 16 }}>
                    {typeInfo.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <select
                      className="select"
                      style={{ height: 32, padding: '0 10px', border: 'none', background: 'transparent', fontWeight: 600 }}
                      value={b.type}
                      onChange={(e) => update(b.id, { type: e.target.value as BonusType })}
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(b.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}
                  >
                    삭제
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
                  <select
                    className="select"
                    value={b.month}
                    onChange={(e) => update(b.id, { month: Number(e.target.value) })}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{m}월</option>
                    ))}
                  </select>
                  <MoneyInput value={b.amount} onChange={(v) => update(b.id, { amount: v })} />
                </div>
              </div>
            );
          })
        )}

        <button className="btn btn-secondary btn-block" type="button" onClick={add} style={{ marginTop: 12 }}>
          + 상여 추가
        </button>
      </div>

      {data.bonuses.length > 0 && (
        <div className="callout info">
          <span className="ico">📊</span>
          <span>총 상여 <strong>{won(total)}</strong>이 연간 총급여에 합산됩니다</span>
        </div>
      )}
    </>
  );
}
