import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Positive = 환급 (받음), negative = 추가납부 (더 냄) — in 원 */
  refund: number;
  ready: boolean;
  onClick?: () => void;
}

const krw = new Intl.NumberFormat('ko-KR');
const MAN = 10_000;
const COUNT_DURATION = 1500; // ms — slowed from 600
const POP_LIFE = 1800; // ms — diff badge floating up

interface DiffPop {
  id: number;
  delta: number; // 원 단위
}

/** 모바일 한 줄에 들어가는 짧은 형태로 만원 단위 표시 — 부호 없이 절댓값. 컬러로 의미 구분 */
function formatTopline(won: number): { main: string; unit: string } {
  const abs = Math.abs(Math.round(won));
  if (abs >= 100_000_000) {
    const eok = abs / 100_000_000;
    return { main: eok.toFixed(eok >= 10 ? 0 : 1), unit: '억' };
  }
  const man = Math.round(abs / MAN);
  return { main: krw.format(man), unit: '만원' };
}

/** 변동분 표시는 부호 의미가 살아있어야 함 (+ 늘었음 / − 줄었음) */
function formatDelta(won: number): { sign: string; main: string; unit: string } {
  const sign = won >= 0 ? '+' : '−';
  const abs = Math.abs(Math.round(won));
  if (abs >= 100_000_000) {
    const eok = abs / 100_000_000;
    return { sign, main: eok.toFixed(eok >= 10 ? 0 : 1), unit: '억' };
  }
  const man = Math.round(abs / MAN);
  return { sign, main: krw.format(man), unit: '만원' };
}

/**
 * Always-visible header counter. When refund changes:
 *  - number rolls from old value to new (1.5s ease-out)
 *  - whole counter pulses (scale + glow flash)
 *  - a floating "+22만원" badge spawns above and drifts up while fading out
 */
export function TaxCounter({ refund, ready, onClick }: Props) {
  const [display, setDisplay] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [pops, setPops] = useState<DiffPop[]>([]);
  // 모바일 키보드가 올라와 카운터가 가려졌을 때 펄스/팝업을 미루기 위한 가시성 추적.
  // visualViewport는 키보드 올라옴/내려감을 resize 이벤트로 즉시 알려줌.
  const [isVisible, setIsVisible] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastValueRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const popIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return; // 미지원 브라우저는 항상 visible로 유지 (기존 동작)

    const check = () => {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewTop = vv.offsetTop;
      const viewBottom = viewTop + vv.height;
      // 카운터가 visualViewport 안에 충분히 보이는지 (8px 여유)
      const visible = rect.top < viewBottom - 8 && rect.bottom > viewTop + 8;
      setIsVisible(visible);
    };

    check();
    vv.addEventListener('resize', check);
    vv.addEventListener('scroll', check);
    return () => {
      vv.removeEventListener('resize', check);
      vv.removeEventListener('scroll', check);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    // 키보드 등으로 카운터가 안 보이는 동안에는 펄스/팝업·카운트 갱신을 보류.
    // lastValueRef를 그대로 두면, 다시 보이는 시점에 누적 delta로 한 번에 트리거됨.
    if (!isVisible) return;
    const from = lastValueRef.current;
    const to = refund;
    if (from === to) {
      setDisplay(to);
      return;
    }

    // Trigger pulse + diff popup (skip on initial 0 → first value to avoid noise)
    const isFirstReveal = from === 0 && Math.abs(to) > 0 && pops.length === 0 && !pulse;
    if (!isFirstReveal) {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
      const id = ++popIdRef.current;
      setPops((p) => [...p, { id, delta: to - from }]);
      window.setTimeout(() => {
        setPops((p) => p.filter((x) => x.id !== id));
      }, POP_LIFE);
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_DURATION);
      // ease-out cubic for a slow settle
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (to - from) * eased);
      setDisplay(v);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        lastValueRef.current = to;
      }
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refund, ready, isVisible]);

  const isRefund = display >= 0;
  const { main, unit } = formatTopline(display);

  // 4단계 날씨 — 금액에 따라 자동 변환
  const displayMan = Math.round(display / MAN);
  const weather = (() => {
    if (displayMan <= -100) return { tone: 'storm', icon: '⛈️', aria: '폭우' };
    if (displayMan < 0) return { tone: 'rain', icon: '🌧️', aria: '비' };
    if (displayMan < 100) return { tone: 'sunny', icon: '⛅', aria: '맑음' };
    return { tone: 'bright', icon: '☀️', aria: '쨍쨍' };
  })();

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`tax-counter ${isRefund ? 'plus' : 'minus'} weather-${weather.tone} ${pulse ? 'pulse' : ''}`}
      onClick={onClick}
      aria-label={`${weather.aria} · ${isRefund ? '예상 환급액' : '예상 추가 납부액'} ${main}${unit}`}
    >
      <span className="tax-counter-weather" aria-hidden>
        <span className="weather-emoji">{weather.icon}</span>
        {(weather.tone === 'storm' || weather.tone === 'rain') && (
          <>
            <span className="rain-drop d1" />
            <span className="rain-drop d2" />
            <span className="rain-drop d3" />
            <span className="rain-drop d4" />
          </>
        )}
      </span>
      <span className="tax-counter-stack">
        <span className="tax-counter-label">
          {isRefund ? '돌려받을 돈' : '더 내야 할 돈'}
        </span>
        <span className="tax-counter-amount">
          {main}
          <span className="unit">{unit}</span>
        </span>
      </span>

      {/* Floating diff popups — 변동분은 부호가 정보 (+늘었음/-줄었음) */}
      <span className="tax-counter-pops" aria-hidden>
        {pops.map((p) => {
          const positive = p.delta > 0;
          const { sign: ds, main: dm, unit: du } = formatDelta(p.delta);
          return (
            <span
              key={p.id}
              className={`tax-counter-pop ${positive ? 'good' : 'bad'}`}
            >
              {ds}{dm}{du}
            </span>
          );
        })}
      </span>
    </button>
  );
}
