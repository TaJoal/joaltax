export const APP_KEYS = {
  profiles: 'app:profiles',
  currentProfile: 'app:currentProfile',
  selectedYear: 'app:selectedYear',
};

export function profileMetaKey(profileKey: string) {
  return `profile:${profileKey}:meta`;
}
export function salariesKey(profileKey: string, year: number) {
  return `profile:${profileKey}:salaries:${year}`;
}
export function bonusesKey(profileKey: string, year: number) {
  return `profile:${profileKey}:bonuses:${year}`;
}
export function cardsKey(profileKey: string, year: number) {
  return `profile:${profileKey}:cards:${year}`;
}
export function deductionsKey(profileKey: string, year: number) {
  return `profile:${profileKey}:deductions:${year}`;
}
export function familyKey(profileKey: string, year: number) {
  return `profile:${profileKey}:family:${year}`;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}
