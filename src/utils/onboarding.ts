const KEY_PREFIX = 'app:onboarding-completed:';

export function hasCompletedOnboarding(profileKey: string): boolean {
  return localStorage.getItem(KEY_PREFIX + profileKey) === '1';
}

export function markOnboardingCompleted(profileKey: string) {
  localStorage.setItem(KEY_PREFIX + profileKey, '1');
}
