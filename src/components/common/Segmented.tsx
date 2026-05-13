interface Item<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  items: Array<Item<T>>;
}

export function Segmented<T extends string>({ value, onChange, items }: Props<T>) {
  return (
    <div className="segmented">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          className={`segmented-item ${value === it.value ? 'active' : ''}`}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
