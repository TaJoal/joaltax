import { Dropdown, Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useYearStore } from '@/store/yearStore';
import { useDataStore } from '@/store/dataStore';
import { availableYears } from '@/data/tax-rules';
import { exportProfile, downloadBackup, importBackup, pickFile } from '@/services/backupService';
import { useCalculation } from '@/hooks/useCalculation';
import { TaxCounter } from './TaxCounter';

export function TopBar() {
  const profile = useAuthStore((s) => s.currentProfile);
  const logout = useAuthStore((s) => s.logout);
  const deleteCurrent = useAuthStore((s) => s.deleteCurrent);
  const year = useYearStore((s) => s.year);
  const setYear = useYearStore((s) => s.setYear);
  const loadData = useDataStore((s) => s.load);
  const navigate = useNavigate();
  const { result } = useCalculation();

  useEffect(() => {
    if (profile) void loadData(profile.key, year);
  }, [profile, year, loadData]);

  if (!profile) return null;

  const firstChar = profile.name.charAt(0);

  const onExport = async () => {
    const backup = await exportProfile(profile);
    downloadBackup(backup);
    message.success('백업 파일을 내려받았어요.');
  };
  const onImport = async () => {
    try {
      const text = await pickFile();
      const imported = await importBackup(text);
      message.success(`${imported.name} 데이터를 가져왔어요.`);
      window.location.reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  };
  const onDelete = () => {
    Modal.confirm({
      title: '프로필을 삭제할까요?',
      content: `${profile.name} 님의 모든 데이터가 영구 삭제됩니다.`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        await deleteCurrent();
        message.success('프로필이 삭제되었습니다.');
        navigate('/login', { replace: true });
      },
    });
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Dropdown
          trigger={['click']}
          menu={{
            items: availableYears().map((y) => ({
              key: String(y),
              label: `${y}년`,
              onClick: () => setYear(y),
            })),
          }}
        >
          <button className="year-pill" type="button">
            {year}년 <span style={{ fontSize: 10 }}>▾</span>
          </button>
        </Dropdown>

        <TaxCounter
          refund={result?.refund ?? 0}
          ready={!!result}
          onClick={() => navigate('/result')}
        />

        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'export', label: '데이터 내보내기', onClick: onExport },
              { key: 'import', label: '데이터 가져오기', onClick: onImport },
              { type: 'divider' },
              {
                key: 'logout',
                label: '로그아웃',
                onClick: () => {
                  logout();
                  navigate('/login', { replace: true });
                },
              },
              { type: 'divider' },
              { key: 'delete', danger: true, label: '프로필 삭제', onClick: onDelete },
            ],
          }}
        >
          <button className="profile-pill" type="button" aria-label={profile.name}>
            <span className="avatar">{firstChar}</span>
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
