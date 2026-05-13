import { create } from 'zustand';
import type { Profile } from '@/types';
import { repositories } from '@/repositories';
import { APP_KEYS } from '@/repositories/localStorage/keys';

interface AuthState {
  currentProfile: Profile | null;
  loading: boolean;
  bootstrap: () => Promise<void>;
  login: (name: string, birthYear?: number) => Promise<Profile>;
  switchTo: (key: string) => Promise<void>;
  updateCurrent: (patch: Partial<Pick<Profile, 'name' | 'birthYear'>>) => Promise<void>;
  logout: () => void;
  deleteCurrent: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentProfile: null,
  loading: true,
  bootstrap: async () => {
    const key = localStorage.getItem(APP_KEYS.currentProfile);
    if (!key) {
      set({ loading: false });
      return;
    }
    const profile = await repositories.profile.get(key);
    set({ currentProfile: profile, loading: false });
  },
  login: async (name: string, birthYear?: number) => {
    const profile = await repositories.profile.create(name, birthYear);
    await repositories.profile.updateLastAccess(profile.key);
    localStorage.setItem(APP_KEYS.currentProfile, profile.key);
    set({ currentProfile: profile });
    return profile;
  },
  updateCurrent: async (patch) => {
    const cur = get().currentProfile;
    if (!cur) return;
    const updated = await repositories.profile.update(cur.key, patch);
    if (updated) set({ currentProfile: updated });
  },
  switchTo: async (key: string) => {
    const profile = await repositories.profile.get(key);
    if (!profile) return;
    await repositories.profile.updateLastAccess(key);
    localStorage.setItem(APP_KEYS.currentProfile, key);
    set({ currentProfile: profile });
  },
  logout: () => {
    localStorage.removeItem(APP_KEYS.currentProfile);
    set({ currentProfile: null });
  },
  deleteCurrent: async () => {
    const cur = get().currentProfile;
    if (!cur) return;
    await repositories.profile.delete(cur.key);
    await repositories.yearData.deleteAllForProfile(cur.key);
    localStorage.removeItem(APP_KEYS.currentProfile);
    set({ currentProfile: null });
  },
}));
