import { useState } from 'react';
import { Drawer } from 'antd';
import type { ExpenseItem } from '@/types';
import { won, wonCompact } from '@/utils/format';
import { MoneyInput } from '@/components/common/MoneyInput';
import type { ExpenseCategory } from './expenseCategories';
import { findCategory } from './expenseCategories';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  emoji: string;
  description?: string;
  categories: ExpenseCategory[];
  items: ExpenseItem[];
  onChange: (items: ExpenseItem[]) => void;
}

function randomId() {
  return Math.random().toString(36).slice(2, 9);
}

export function ExpenseSheet({
  open,
  onClose,
  title,
  emoji,
  description,
  categories,
  items,
  onChange,
}: Props) {
  const [newCategory, setNewCategory] = useState<string>(categories[0].key);
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newMemo, setNewMemo] = useState<string>('');

  const total = items.reduce((s, i) => s + i.amount, 0);

  const addItem = () => {
    if (newAmount <= 0) return;
    const item: ExpenseItem = {
      id: randomId(),
      category: newCategory,
      amount: newAmount,
      memo: newMemo.trim() || undefined,
    };
    onChange([...items, item]);
    setNewAmount(0);
    setNewMemo('');
  };

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, patch: Partial<ExpenseItem>) => {
    onChange(items.map((i) => (i === undefined ? i : i.id === id ? { ...i, ...patch } : i)));
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
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
      {/* Sheet handle */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: 'var(--bg)',
          zIndex: 5,
          paddingTop: 12,
          paddingBottom: 8,
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
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px' }}>
          <div style={{ fontSize: 20, marginRight: 8 }}>{emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>{title}</div>
            {description && (
              <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{description}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary btn-sm"
            style={{ borderRadius: 999 }}
          >
            완료
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 20px 40px' }}>
        {/* Big total */}
        <div className="card" style={{ background: '#0a0a0a', color: '#fff', textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            총 입력액
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
            {won(total)}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            {items.length}건
          </div>
        </div>

        {/* Items list */}
        {items.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 0',
              color: 'var(--ink-soft)',
              fontSize: 13,
            }}
          >
            아직 등록된 항목이 없어요
          </div>
        ) : (
          <div className="card">
            <h3 className="card-title">등록된 항목</h3>
            {items.map((item) => {
              const cat = findCategory(categories, item.category);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--line)',
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
                    {cat.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{cat.label}</div>
                    {item.memo && (
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                        {item.memo}
                      </div>
                    )}
                    {cat.note && (
                      <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 2, fontWeight: 600 }}>
                        {cat.note}
                      </div>
                    )}
                    <div style={{ marginTop: 6, width: 140 }}>
                      <MoneyInput
                        value={item.amount}
                        onChange={(v) => updateItem(item.id, { amount: v })}
                        suffix=""
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger)',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    삭제
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add form */}
        <div className="card">
          <h3 className="card-title">+ 항목 추가</h3>

          <div className="field">
            <label className="field-label">항목 종류</label>
            <div className="scroll-x" style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setNewCategory(c.key)}
                  className={`year-chip ${newCategory === c.key ? 'active' : ''}`}
                  style={{ padding: '8px 14px', minWidth: 'auto' }}
                  title={c.note}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            {(() => {
              const cat = findCategory(categories, newCategory);
              return cat.note ? (
                <div className="field-hint">{cat.note}</div>
              ) : null;
            })()}
          </div>

          <div className="field">
            <label className="field-label">금액</label>
            <MoneyInput value={newAmount} onChange={setNewAmount} />
          </div>

          <div className="field">
            <label className="field-label">메모 (선택)</label>
            <input
              className="input"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="예: 정기검진, 처방약 등"
            />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={addItem}
            disabled={newAmount <= 0}
            style={{ opacity: newAmount <= 0 ? 0.5 : 1 }}
          >
            추가하기
          </button>
        </div>

        {items.length > 0 && (
          <div className="callout info" style={{ marginTop: 12 }}>
            <span className="ico">💡</span>
            <span>
              지금까지 등록한 {items.length}건의 합계 <strong>{wonCompact(total)}</strong>이 공제 계산에 반영돼요.
            </span>
          </div>
        )}
      </div>
    </Drawer>
  );
}
