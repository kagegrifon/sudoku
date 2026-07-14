// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { applyTheme } from './useApplyTheme';

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('applyTheme', () => {
  it('light проставляет data-theme="light"', () => {
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('dark проставляет data-theme="dark"', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('system СНИМАЕТ data-theme (иначе media-query мёртв)', () => {
    applyTheme('dark');
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
