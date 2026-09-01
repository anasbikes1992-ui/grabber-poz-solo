export type StaffTheme = 'dark' | 'light';

const STORAGE_KEY = 'grabber_staff_theme';

export function readStaffTheme(): StaffTheme {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export function applyStaffTheme(theme: StaffTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function writeStaffTheme(theme: StaffTheme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyStaffTheme(theme);
  window.dispatchEvent(new Event('grabber-theme-change'));
}

export function toggleStaffTheme(): StaffTheme {
  const next: StaffTheme = readStaffTheme() === 'dark' ? 'light' : 'dark';
  writeStaffTheme(next);
  return next;
}
