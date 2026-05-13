import type { Profile } from '@/types';
import type { IProfileRepository } from '../interfaces/IProfileRepository';
import { APP_KEYS, normalizeName, profileMetaKey } from './keys';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export class LocalStorageProfileRepository implements IProfileRepository {
  async list(): Promise<Profile[]> {
    return readJson<Profile[]>(APP_KEYS.profiles, []);
  }

  async get(key: string): Promise<Profile | null> {
    const all = await this.list();
    return all.find((p) => p.key === key) ?? null;
  }

  async findByName(name: string): Promise<Profile | null> {
    const key = normalizeName(name);
    return this.get(key);
  }

  async create(name: string, birthYear?: number): Promise<Profile> {
    const all = await this.list();
    const key = normalizeName(name);
    if (!key) throw new Error('이름을 입력해주세요.');
    const existing = all.find((p) => p.key === key);
    if (existing) return existing;
    const now = new Date().toISOString();
    const newProfile: Profile = {
      key,
      name: name.trim(),
      birthYear,
      createdAt: now,
      lastAccessAt: now,
    };
    writeJson(APP_KEYS.profiles, [...all, newProfile]);
    writeJson(profileMetaKey(key), { ...newProfile });
    return newProfile;
  }

  async update(
    key: string,
    patch: Partial<Pick<Profile, 'name' | 'birthYear'>>,
  ): Promise<Profile | null> {
    const all = await this.list();
    const idx = all.findIndex((p) => p.key === key);
    if (idx < 0) return null;
    const next: Profile = { ...all[idx], ...patch };
    const nextAll = [...all];
    nextAll[idx] = next;
    writeJson(APP_KEYS.profiles, nextAll);
    writeJson(profileMetaKey(key), { ...next });
    return next;
  }

  async delete(key: string): Promise<void> {
    const all = await this.list();
    writeJson(APP_KEYS.profiles, all.filter((p) => p.key !== key));
    localStorage.removeItem(profileMetaKey(key));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`profile:${key}:`)) {
        localStorage.removeItem(k);
      }
    }
    const current = localStorage.getItem(APP_KEYS.currentProfile);
    if (current === key) localStorage.removeItem(APP_KEYS.currentProfile);
  }

  async updateLastAccess(key: string): Promise<void> {
    const all = await this.list();
    const now = new Date().toISOString();
    const next = all.map((p) => (p.key === key ? { ...p, lastAccessAt: now } : p));
    writeJson(APP_KEYS.profiles, next);
  }
}
