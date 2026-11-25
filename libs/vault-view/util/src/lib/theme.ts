export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'vault-view-theme';

export function resolveInitialTheme(
  search: string,
  stored: string | null,
): ThemeMode {
  const query = new URLSearchParams(search).get('theme');
  const candidate = query || stored;
  return candidate === 'light' ? 'light' : 'dark';
}

export function readStoredTheme(
  storage?: Pick<Storage, 'getItem'>,
): string | null {
  try {
    return (storage ?? globalThis.localStorage).getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredTheme(
  theme: ThemeMode,
  storage?: Pick<Storage, 'setItem'>,
): boolean {
  try {
    (storage ?? globalThis.localStorage).setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

export function hasPresentQuery(search: string): boolean {
  return new URLSearchParams(search).has('present');
}
