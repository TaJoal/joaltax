import { LocalStorageProfileRepository } from './localStorage/ProfileRepository';
import { LocalStorageYearDataRepository } from './localStorage/YearDataRepository';

export const repositories = {
  profile: new LocalStorageProfileRepository(),
  yearData: new LocalStorageYearDataRepository(),
};

export type Repositories = typeof repositories;
export {
  emptyMonthSalary,
  emptyMonthCard,
  emptyDeductions,
} from './localStorage/YearDataRepository';
