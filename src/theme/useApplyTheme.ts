import { useEffect } from 'react';

export type Theme = 'system' | 'light' | 'dark';

/**
 * Применяет тему к <html>. Для `system` атрибут data-theme СНИМАЕТСЯ,
 * чтобы работал media-query prefers-color-scheme (ADR-0006). Для light/dark —
 * проставляется явно.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export function useApplyTheme(theme: Theme): void {
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
}
