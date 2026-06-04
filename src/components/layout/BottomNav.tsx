import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';

/**
 * 라인 아이콘 — 모두 currentColor 상속 (활성/비활성 색상 전환 + 코랄 점 인디케이터 그대로 작동).
 * viewBox 24, stroke 1.7, round cap/join 으로 통일된 고급 라인 룩.
 */
const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ICONS: Record<string, ReactElement> = {
  home: (
    <svg {...iconProps}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    </svg>
  ),
  deduction: (
    <svg {...iconProps}>
      <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </svg>
  ),
  salary: (
    <svg {...iconProps}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M5.5 9.5v5M18.5 9.5v5" />
    </svg>
  ),
  result: (
    <svg {...iconProps}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 7h7" />
      <g fill="currentColor" stroke="none">
        <circle cx="9" cy="12" r="0.9" />
        <circle cx="12" cy="12" r="0.9" />
        <circle cx="15" cy="12" r="0.9" />
        <circle cx="9" cy="15.5" r="0.9" />
        <circle cx="12" cy="15.5" r="0.9" />
        <circle cx="15" cy="15.5" r="0.9" />
      </g>
    </svg>
  ),
  comparison: (
    <svg {...iconProps}>
      <path d="M3.5 20.5h17" />
      <path d="M6.5 20.5V12M12 20.5V5M17.5 20.5v-6" />
    </svg>
  ),
};

const ITEMS = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/deduction', label: '공제', icon: 'deduction' },
  { to: '/salary', label: '급여', icon: 'salary' },
  { to: '/result', label: '계산', icon: 'result' },
  { to: '/comparison', label: '비교', icon: 'comparison' },
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
            <span className="icon">{ICONS[it.icon]}</span>
            <span>{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
