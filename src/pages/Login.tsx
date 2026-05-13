import { useEffect, useState } from 'react';
import { App as AntApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { repositories } from '@/repositories';
import type { Profile } from '@/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('ko');

export function LoginPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);
  const switchTo = useAuthStore((s) => s.switchTo);
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  useEffect(() => {
    void repositories.profile.list().then(setProfiles);
  }, []);

  const onCreate = async () => {
    if (!name.trim()) {
      message.warning('이름을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await login(name);
      navigate('/', { replace: true });
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onPick = async (p: Profile) => {
    await switchTo(p.key);
    navigate('/', { replace: true });
  };

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div className="login-emoji">😩</div>
        <h1 className="login-title">
          거지같은<br />
          연말정산
        </h1>
        <p className="login-subtitle">
          올해도 토해낼 것 같다면?<br />
          연봉·카드·가족만 넣어봐요.<br />
          환급받을 방법 같이 찾아드릴게요.
        </p>
      </div>

      {/* Trust notices */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
          <div style={{ fontSize: 12, color: '#065f46', lineHeight: 1.55 }}>
            <strong>어떤 경우에도 입력하신 정보를 외부로 전송하거나 수집하지 않습니다.</strong>
            <br />
            <span style={{ color: '#0f766e' }}>
              모든 데이터는 이 기기의 브라우저에만 임시 저장돼요.
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.55 }}>
            <strong>본 결과는 추정치예요.</strong>
            <br />
            <span style={{ color: '#a16207' }}>
              실제 홈택스 연말정산 결과와 차이가 있을 수 있습니다. 참고용으로만 사용해주세요.
            </span>
          </div>
        </div>
      </div>

      {profiles.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600, marginBottom: 8 }}>
            이어서 사용하기
          </div>
          <div className="login-profiles">
            {profiles.map((p) => (
              <button key={p.key} className="login-profile" onClick={() => onPick(p)} type="button">
                <span className="avatar">{p.name.charAt(0)}</span>
                <div style={{ flex: 1 }}>
                  <div className="name">{p.name}</div>
                  <div className="meta">마지막 사용 {dayjs(p.lastAccessAt).fromNow()}</div>
                </div>
                <span className="arrow">›</span>
              </button>
            ))}
          </div>
          <div className="login-divider">또는</div>
        </>
      )}

      <div className="login-input">
        <input
          className="input"
          placeholder="아무 이름이나 (가족 구분용)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onCreate()}
        />
        <button
          className="btn btn-primary"
          onClick={onCreate}
          disabled={submitting}
          type="button"
        >
          {submitting ? '...' : '시작'}
        </button>
      </div>

      <p className="login-note">
        이름은 본인/배우자/부모 등 여러 사람의 데이터를 구분하기 위한 라벨일 뿐이에요.<br />
        실명을 쓰지 않아도 됩니다.
      </p>
    </div>
  );
}
