import type {
  MonthlySalary,
  Bonus,
  MonthlyCardSpending,
  Deductions,
  FamilyMember,
  YearData,
} from '@/types';

export interface IYearDataRepository {
  getYearData(profileKey: string, year: number): Promise<YearData>;
  getSalaries(profileKey: string, year: number): Promise<MonthlySalary[]>;
  saveSalaries(profileKey: string, year: number, data: MonthlySalary[]): Promise<void>;
  upsertSalaryMonth(
    profileKey: string,
    year: number,
    month: number,
    data: MonthlySalary,
  ): Promise<void>;
  applyRaise(
    profileKey: string,
    year: number,
    fromMonth: number,
    salary: MonthlySalary,
  ): Promise<void>;

  getBonuses(profileKey: string, year: number): Promise<Bonus[]>;
  saveBonuses(profileKey: string, year: number, data: Bonus[]): Promise<void>;

  getCards(profileKey: string, year: number): Promise<MonthlyCardSpending[]>;
  saveCards(profileKey: string, year: number, data: MonthlyCardSpending[]): Promise<void>;

  getDeductions(profileKey: string, year: number): Promise<Deductions>;
  saveDeductions(profileKey: string, year: number, data: Deductions): Promise<void>;

  getFamily(profileKey: string, year: number): Promise<FamilyMember[]>;
  saveFamily(profileKey: string, year: number, data: FamilyMember[]): Promise<void>;

  deleteAllForProfile(profileKey: string): Promise<void>;
  listYears(profileKey: string): Promise<number[]>;
}
