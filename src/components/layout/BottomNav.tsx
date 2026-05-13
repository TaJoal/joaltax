import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/deduction', label: '공제', icon: '🧾' },
  { to: '/salary', label: '급여', icon: '💼' },
  { to: '/result', label: '계산', icon: '📊' },
  { to: '/comparison', label: '비교', icon: '🔄' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="icon">{it.icon}</span>
            <span>{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
