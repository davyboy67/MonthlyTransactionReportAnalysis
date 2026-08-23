import type { ThemeName } from '@transaction-report/shared';

// A module store, not React context: only the chart components need JS-side
// theme awareness, so a provider would re-render the whole tree for nothing.
// `<html data-theme>` stays the source of truth; this is a typed mirror of it.

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';

const listeners = new Set<() => void>();

function systemTheme(): ThemeName {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Private browsing or storage disabled. Fall through to the default.
  }
  return 'light';
}

let preference: ThemePreference = readStoredPreference();
// The boot script already resolved and applied this; trust the DOM over recomputing.
let resolved: ThemeName =
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');

function apply(next: ThemeName): void {
  if (next === resolved) return;
  resolved = next;
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', next === 'dark' ? '#121211' : '#ffffff');
  }

  listeners.forEach(fn => fn());
}

function onSystemChange(): void {
  if (preference === 'system') apply(systemTheme());
}
systemQuery.addEventListener('change', onSystemChange);

export function getPreference(): ThemePreference {
  return preference;
}

export function setPreference(next: ThemePreference): void {
  preference = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Non-fatal: the theme still applies for this session.
  }
  apply(next === 'system' ? systemTheme() : next);
  listeners.forEach(fn => fn());
}

export function getResolvedTheme(): ThemeName {
  return resolved;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
