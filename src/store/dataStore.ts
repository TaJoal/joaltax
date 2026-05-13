import { create } from 'zustand';
import type {
  Bonus,
  Deductions,
  FamilyMember,
  MonthlyCardSpending,
  MonthlySalary,
  YearData,
} from '@/types';
import { repositories } from '@/repositories';

interface DataState {
  data: YearData | null;
  loading: boolean;
  profileKey: string | null;
  year: number | null;
  load: (profileKey: string, year: number) => Promise<void>;
  refresh: () => Promise<void>;

  saveSalaries: (salaries: MonthlySalary[]) => Promise<void>;
  applyRaiseFrom: (fromMonth: number, salary: MonthlySalary) => Promise<void>;
  saveCards: (cards: MonthlyCardSpending[]) => Promise<void>;
  saveBonuses: (bonuses: Bonus[]) => Promise<void>;
  saveDeductions: (d: Deductions) => Promise<void>;
  saveFamily: (f: FamilyMember[]) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  data: null,
  loading: false,
  profileKey: null,
  year: null,
  load: async (profileKey, year) => {
    set({ loading: true, profileKey, year });
    const data = await repositories.yearData.getYearData(profileKey, year);
    set({ data, loading: false });
  },
  refresh: async () => {
    const { profileKey, year } = get();
    if (!profileKey || year == null) return;
    const data = await repositories.yearData.getYearData(profileKey, year);
    set({ data });
  },
  saveSalaries: async (salaries) => {
    const { profileKey, year } = get();
    if (!profileKey || year == null) return;
    await repositories.yearData.saveSalaries(profileKey, year, salaries);
    await get().refresh();
  },
  applyRaiseFrom: async (fromMonth, salary) => {
    const { profileKey, year } = get();
    if (!profileKey || year == null) return;
    await repositories.yearData.applyRaise(profileKey, year, fromMonth, salary);
    await get().refresh();
  },
  saveCards: async (cards) => {
    const { profileKey, year } = get();
    if (!profileKey || year == null) return;
    await repositories.yearData.saveCards(profileKey, year, cards);
    await get().refresh();
  },
  saveBonuses: async (bonuses) => {
    const { profileKey, year } = get();
    if (!profileKey || year == null) return;
    await repositories.yearData.saveBonuses(profileKey, year, bonuses);
    await get().refresh();
  },
  saveDeductions: async (d) => {
    const { profileKey, year } = get();
    if (!profileKey || year == null) return;
    await repositories.yearData.saveDeductions(profileKey, year, d);
    await get().refresh();
  },
  saveFamily: async (f) => {
    const { profileKey, year } = get();
    if (!profileKey || year == null) return;
    await repositories.yearData.saveFamily(profileKey, year, f);
    await get().refresh();
  },
}));
