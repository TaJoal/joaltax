import type { Profile } from '@/types';
import { repositories } from '@/repositories';
import { APP_KEYS, profileMetaKey } from '@/repositories/localStorage/keys';

interface ProfileBackup {
  version: 1;
  exportedAt: string;
  profile: Profile;
  data: Record<string, unknown>;
}

export async function exportProfile(profile: Profile): Promise<ProfileBackup> {
  const entries: Record<string, unknown> = {};
  const prefix = `profile:${profile.key}:`;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k === profileMetaKey(profile.key) || k.startsWith(prefix)) {
      const raw = localStorage.getItem(k);
      try {
        entries[k] = raw ? JSON.parse(raw) : null;
      } catch {
        entries[k] = raw;
      }
    }
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    data: entries,
  };
}

export function downloadBackup(backup: ProfileBackup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tax-sim-${backup.profile.key}-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBackup(text: string): Promise<Profile> {
  let parsed: ProfileBackup;
  try {
    parsed = JSON.parse(text) as ProfileBackup;
  } catch {
    throw new Error('JSON 형식이 올바르지 않습니다.');
  }
  if (parsed.version !== 1 || !parsed.profile || !parsed.data) {
    throw new Error('지원하지 않는 백업 형식입니다.');
  }
  const all = await repositories.profile.list();
  const exists = all.some((p) => p.key === parsed.profile.key);
  if (!exists) {
    const profilesRaw = localStorage.getItem(APP_KEYS.profiles);
    const profiles = profilesRaw ? JSON.parse(profilesRaw) : [];
    localStorage.setItem(APP_KEYS.profiles, JSON.stringify([...profiles, parsed.profile]));
  }
  for (const [key, value] of Object.entries(parsed.data)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  return parsed.profile;
}

export function pickFile(accept = 'application/json'): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('파일이 선택되지 않았습니다.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}
