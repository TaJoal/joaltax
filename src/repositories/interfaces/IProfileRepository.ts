import type { Profile } from '@/types';

export interface IProfileRepository {
  list(): Promise<Profile[]>;
  get(key: string): Promise<Profile | null>;
  findByName(name: string): Promise<Profile | null>;
  create(name: string, birthYear?: number): Promise<Profile>;
  update(key: string, patch: Partial<Pick<Profile, 'name' | 'birthYear'>>): Promise<Profile | null>;
  delete(key: string): Promise<void>;
  updateLastAccess(key: string): Promise<void>;
}
