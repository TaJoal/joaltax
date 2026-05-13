import { Empty } from 'antd';
import { Link } from 'react-router-dom';
import { useDataStore } from '@/store/dataStore';
import { useCalculation } from '@/hooks/useCalculation';
import { useAuthStore } from '@/store/authStore';
import { useYearStore } from '@/store/yearStore';
import { won, wonCompact } from '@/utils/format';
import { getAge, getAgeBracket } from '@/utils/age';
import { buildRecommendations } from '@/services/recommendations';

export function DashboardPage() {
  const data = useDataStore((s) => s.data);
  const profile = useAuthStore((s) => s.currentProfile);
  const year = useYearStore((s) => s.year);
  const { result } = useCalculation();

  if (!data || !result) {
    return (
      <div className="card">
        <Empty description="데이터를 불러오는 중..." />
      </div>
    );
  }

  const age = getAge(profile?.birthYear, year);
  const ageBracket = getAgeBracket(age);
  const recs = buildRecommendations({ data, result, ageBracket });

  const refund = result.refund;
  const isRefund = refund >= 0;
  const prepaid = result.prepaidTax; // 매달 원천징수로 미리 낸 합계
  const determined = result.determinedTax; // 올해 어차피 낼 진짜 세금

  // 금액에 따른 기분/날씨 표현 (만원 단위)
  const refundMan = Math.round(refund / 10_000);
  const mood = (() => {
    if (refundMan <= -200) return { weather: '⛈️', face: '😱', label: '폭풍', tone: 'storm' };
    if (refundMan <= -50) return { weather: '🌧️', face: '😟', label: '비', tone: 'rain' };
    if (refundMan < 0) return { weather: '☁️', face: '😐', label: '흐림', tone: 'cloudy' };
    if (refundMan === 0) return { weather: '⛅', face: '🙂', label: '구름조금', tone: 'partly' };
    if (refundMan < 50) return { weather: '🌤️', face: '😊', label: '맑음', tone: 'sunny' };
    if (refundMan < 200) return { weather: '☀️', face: '😄', label: '쨍쨍', tone: 'bright' };
    return { weather: '🌈', face: '🤩', label: '무지개', tone: 'rainbow' };
  })();

  // 액션 가능한(아직 안 한) 추천만
  const todoRecs = recs.filter((r) => !r.done);
  const doneRecs = recs.filter((r) => r.done);
  const youthRecs = todoRecs.filter((r) => r.badge === '청년');

  return (
    <>
      {/* ============ 1. 정산 점수 카드 — 단순 뺄셈식 ============ */}
      <div className={`score-card mood-${mood.tone}`}>
        <div className="score-top">
          <span className="score-eyebrow">{year}년 연말정산</span>
          <Link to="/result" className="score-detail">자세히 ›</Link>
        </div>

        <div className="score-mood">
          <span className="score-mood-icon" aria-hidden>{mood.weather}{mood.face}</span>
          <span className="score-mood-label">{mood.label}</span>
        </div>

        {/* 보조: 뺄셈 위쪽 두 줄 */}
        <div className="score-calc">
          <div className="score-calc-row">
            <span className="score-calc-label">올해 내야 할 세금</span>
            <span className="score-calc-value">{won(determined)}</span>
          </div>
          <div className="score-calc-row">
            <span className="score-calc-label">매달 미리 낸 세금</span>
            <span className="score-calc-value">
              <span className="op">−</span> {won(prepaid)}
            </span>
          </div>
          <div className="score-calc-divider" />
        </div>

        {/* 메인: 결과 (큼지막) */}
        <div className={`score-result ${isRefund ? 'good' : 'bad'}`}>
          <span className="score-result-label">
            {isRefund ? '돌려받을 돈' : '더 내야 할 돈'}
          </span>
          <span className="score-result-value">
            {won(Math.abs(refund))}
          </span>
        </div>

        <div className="score-hint">
          {isRefund
            ? '아래 항목을 추가하면 더 많이 돌려받을 수 있어요'
            : '아래 항목을 추가하면 더 내야 할 돈이 줄어들어요'}
        </div>
      </div>

      {/* ============ 2. 청년 정책 (해당 시 별도 강조) ============ */}
      {ageBracket === 'youth' && youthRecs.length > 0 && (
        <div className="card youth-card">
          <div className="youth-card-head">
            <span className="youth-badge">청년 만 {age}세</span>
            <h3 className="card-title" style={{ margin: 0 }}>당신만 받을 수 있는 혜택</h3>
          </div>
          <div className="youth-card-body">
            {youthRecs.slice(0, 3).map((r) => (
              <Link key={r.id} to={r.href} className="rec-row">
                <span className="rec-icon">{r.icon}</span>
                <div className="rec-text">
                  <div className="rec-title">{r.title}</div>
                  <div className="rec-desc">{r.description}</div>
                </div>
                {r.estimatedSavings > 0 && (
                  <span className="rec-saving">+{wonCompact(r.estimatedSavings)}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ============ 3. 액션 체크리스트 ============ */}
      <div className="card">
        <div className="checklist-head">
          <h3 className="card-title" style={{ margin: 0 }}>
            {isRefund ? '더 받을 수 있어요' : '추가납부 줄이는 법'}
          </h3>
          <span className="checklist-progress">
            {doneRecs.length}/{recs.length}
          </span>
        </div>
        <p className="card-subtle" style={{ marginTop: 8, marginBottom: 12 }}>
          항목을 추가할수록 위 점수가 바뀌어요.
        </p>

        {todoRecs
          .filter((r) => r.badge !== '청년')
          .slice(0, 6)
          .map((r) => (
            <Link key={r.id} to={r.href} className="rec-row">
              <span className="rec-check off" />
              <span className="rec-icon">{r.icon}</span>
              <div className="rec-text">
                <div className="rec-title">
                  {r.title}
                  {r.badge && <span className="rec-badge">{r.badge}</span>}
                </div>
                <div className="rec-desc">{r.description}</div>
              </div>
              {r.estimatedSavings > 0 && (
                <span className="rec-saving">+{wonCompact(r.estimatedSavings)}</span>
              )}
            </Link>
          ))}

        {doneRecs.length > 0 && (
          <details className="rec-done-fold">
            <summary>✓ 입력 완료 {doneRecs.length}개</summary>
            {doneRecs.map((r) => (
              <Link key={r.id} to={r.href} className="rec-row done">
                <span className="rec-check on">✓</span>
                <span className="rec-icon">{r.icon}</span>
                <div className="rec-text">
                  <div className="rec-title">{r.title}</div>
                  <div className="rec-desc">{r.description}</div>
                </div>
              </Link>
            ))}
          </details>
        )}
      </div>

      {/* ============ 4. 자세히 보기 (전문가 모드) ============ */}
      <div className="card">
        <h3 className="card-title">자세히 보기</h3>
        <Link to="/salary" className="list-row">
          <span className="icon">💼</span>
          <div className="text">
            <div className="primary">월별 급여 / 상여</div>
            <div className="secondary">월별로 다르거나 상여가 있으면</div>
          </div>
          <span style={{ color: 'var(--ink-soft)' }}>›</span>
        </Link>
        <Link to="/deduction" className="list-row">
          <span className="icon">🧾</span>
          <div className="text">
            <div className="primary">정산 항목 전체</div>
            <div className="secondary">카드·의료비·연금 등 모든 항목</div>
          </div>
          <span style={{ color: 'var(--ink-soft)' }}>›</span>
        </Link>
        <Link to="/result" className="list-row">
          <span className="icon">📊</span>
          <div className="text">
            <div className="primary">단계별 계산 과정</div>
            <div className="secondary">총급여 → 과세표준 → 세금 흐름</div>
          </div>
          <span style={{ color: 'var(--ink-soft)' }}>›</span>
        </Link>
        <Link to="/comparison" className="list-row">
          <span className="icon">🔄</span>
          <div className="text">
            <div className="primary">연도 비교</div>
            <div className="secondary">작년 vs 올해 — 얼마나 달라졌나</div>
          </div>
          <span style={{ color: 'var(--ink-soft)' }}>›</span>
        </Link>
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
        ⚠️ 본 결과는 추정치예요. 실제 홈택스와 차이가 있을 수 있어요.<br />
        모든 데이터는 이 기기에만 저장돼요.
      </p>
    </>
  );
}
