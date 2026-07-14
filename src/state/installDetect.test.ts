import { describe, it, expect } from 'vitest';
import { isIosSafari } from './installDetect';

// Реальные UA-строки (усечённые до значимых частей).
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_SAFARI =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1';
const IOS_FIREFOX =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const DESKTOP_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

describe('isIosSafari', () => {
  it('true для iOS Safari (iPhone)', () => {
    expect(isIosSafari(IOS_SAFARI)).toBe(true);
  });

  it('true для iPadOS Safari', () => {
    expect(isIosSafari(IPAD_SAFARI)).toBe(true);
  });

  it('false для iOS Chrome (CriOS)', () => {
    expect(isIosSafari(IOS_CHROME)).toBe(false);
  });

  it('false для iOS Firefox (FxiOS)', () => {
    expect(isIosSafari(IOS_FIREFOX)).toBe(false);
  });

  it('false для Android Chrome', () => {
    expect(isIosSafari(ANDROID_CHROME)).toBe(false);
  });

  it('false для десктопного Safari (не iOS)', () => {
    expect(isIosSafari(DESKTOP_SAFARI)).toBe(false);
  });
});
