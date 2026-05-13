import { create } from 'zustand';
import { APP_KEYS } from '@/repositories/localStorage/keys';

interface YearState {
  year: number;
  setYear: (year: number) => void;
  bootstrap: () => void;
}

const CURRENT_DEFAULT = new Date().getFullYear();

export const useYearStore = create<YearState>((set) => ({
  year: CURRENT_DEFAULT,
  setYear: (year: number) => {
    localStorage.setItem(APP_KEYS.selectedYear, String(year));
    set({ year });
  },
  bootstrap: () => {
    const raw = localStorage.getItem(APP_KEYS.selectedYear);
    const parsed = raw ? Number(raw) : CURRENT_DEFAULT;
    set({ year: Number.isFinite(parsed) ? parsed : CURRENT_DEFAULT });
  },
}));
