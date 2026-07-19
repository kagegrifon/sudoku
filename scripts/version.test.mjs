import { describe, expect, it } from 'vitest';
import { compareVersions, parseVersion } from './version.mjs';

describe('parseVersion', () => {
  it('разбирает строку в major/minor/patch', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('разбирает нули', () => {
    expect(parseVersion('0.0.0')).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  it('бросает на невалидном SemVer', () => {
    expect(() => parseVersion('1.2')).toThrow();
    expect(() => parseVersion('v1.2.3')).toThrow();
    expect(() => parseVersion('1.2.3-beta')).toThrow();
    expect(() => parseVersion('')).toThrow();
  });
});

describe('compareVersions', () => {
  it('сравнивает patch как числа, а не как строки', () => {
    expect(compareVersions('0.1.10', '0.1.9')).toBeGreaterThan(0);
  });

  it('сравнивает minor как числа, а не как строки', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
  });

  it('major важнее minor и patch', () => {
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0);
  });

  it('равные версии дают 0', () => {
    expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
  });

  it('меньшая версия даёт отрицательное число', () => {
    expect(compareVersions('0.1.0', '0.2.0')).toBeLessThan(0);
  });
});
