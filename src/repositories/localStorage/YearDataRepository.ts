import type {
  Bonus,
  Deductions,
  FamilyMember,
  MonthlyCardSpending,
  MonthlySalary,
  YearData,
} from '@/types';
import type { IYearDataRepository } from '../interfaces/IYearDataRepository';
import {
  bonusesKey,
  cardsKey,
  deductionsKey,
  familyKey,
  salariesKey,
} from './keys';

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

export function emptyMonthSalary(month: number): MonthlySalary {
  return {
    month,
    grossPay: 0,
    nationalPension: 0,
    healthInsurance: 0,
    longTermCare: 0,
    employmentInsurance: 0,
    incomeTax: 0,
    localIncomeTax: 0,
    nonTaxable: 0,
  };
}

export function emptyMonthCard(month: number): MonthlyCardSpending {
  return {
    month,
    creditCard: 0,
    checkCard: 0,
    cashReceipt: 0,
    traditionalMarket: 0,
    publicTransport: 0,
    books: 0,
  };
}

export function emptyDeductions(): Deductions {
  return {
    medical: 0,
    education: 0,
    donationGeneral: 0,
    donationPolitical: 0,
    donationHometown: 0,
    pensionSaving: 0,
    irp: 0,
    housingSaving: 0,
    monthlyRent: 0,
    insurance: 0,
    isSingleParent: false,
  };
}

function fillYear<T>(arr: T[], factory: (month: number) => T): T[] {
  const out: T[] = [];
  for (let m = 1; m <= 12; m++) {
    const found = arr.find((x: any) => x.month === m);
    out.push(found ?? factory(m));
  }
  return out;
}

export class LocalStorageYearDataRepository implements IYearDataRepository {
  async getYearData(profileKey: string, year: number): Promise<YearData> {
    const [salaries, bonuses, cards, deductions, family] = await Promise.all([
      this.getSalaries(profileKey, year),
      this.getBonuses(profileKey, year),
      this.getCards(profileKey, year),
      this.getDeductions(profileKey, year),
      this.getFamily(profileKey, year),
    ]);
    return { year, salaries, bonuses, cards, deductions, family };
  }

  async getSalaries(profileKey: string, year: number): Promise<MonthlySalary[]> {
    const raw = readJson<MonthlySalary[]>(salariesKey(profileKey, year), []);
    return fillYear(raw, emptyMonthSalary);
  }
  async saveSalaries(profileKey: string, year: number, data: MonthlySalary[]) {
    writeJson(salariesKey(profileKey, year), data);
  }
  async upsertSalaryMonth(
    profileKey: string,
    year: number,
    month: number,
    data: MonthlySalary,
  ) {
    const all = await this.getSalaries(profileKey, year);
    const next = all.map((s) => (s.month === month ? { ...data, month } : s));
    await this.saveSalaries(profileKey, year, next);
  }
  async applyRaise(
    profileKey: string,
    year: number,
    fromMonth: number,
    salary: MonthlySalary,
  ) {
    const all = await this.getSalaries(profileKey, year);
    const next = all.map((s) =>
      s.month >= fromMonth ? { ...salary, month: s.month } : s,
    );
    await this.saveSalaries(profileKey, year, next);
  }

  async getBonuses(profileKey: string, year: number): Promise<Bonus[]> {
    return readJson<Bonus[]>(bonusesKey(profileKey, year), []);
  }
  async saveBonuses(profileKey: string, year: number, data: Bonus[]) {
    writeJson(bonusesKey(profileKey, year), data);
  }

  async getCards(profileKey: string, year: number): Promise<MonthlyCardSpending[]> {
    const raw = readJson<MonthlyCardSpending[]>(cardsKey(profileKey, year), []);
    return fillYear(raw, emptyMonthCard);
  }
  async saveCards(profileKey: string, year: number, data: MonthlyCardSpending[]) {
    writeJson(cardsKey(profileKey, year), data);
  }

  async getDeductions(profileKey: string, year: number): Promise<Deductions> {
    return readJson<Deductions>(deductionsKey(profileKey, year), emptyDeductions());
  }
  async saveDeductions(profileKey: string, year: number, data: Deductions) {
    writeJson(deductionsKey(profileKey, year), data);
  }

  async getFamily(profileKey: string, year: number): Promise<FamilyMember[]> {
    return readJson<FamilyMember[]>(familyKey(profileKey, year), []);
  }
  async saveFamily(profileKey: string, year: number, data: FamilyMember[]) {
    writeJson(familyKey(profileKey, year), data);
  }

  async deleteAllForProfile(profileKey: string) {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`profile:${profileKey}:`)) {
        localStorage.removeItem(k);
      }
    }
  }

  async listYears(profileKey: string): Promise<number[]> {
    const years = new Set<number>();
    const prefix = `profile:${profileKey}:salaries:`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const y = Number(k.slice(prefix.length));
        if (!Number.isNaN(y)) years.add(y);
      }
    }
    return [...years].sort();
  }
}
