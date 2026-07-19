import { describe, it, expect } from 'vitest';
import {
  nextUpdateCheckState,
  NOTICE_STATES,
  type UpdateCheckState,
} from './updateCheckState';

describe('nextUpdateCheckState', () => {
  it('checkStarted переводит в checking из любого нетерминального состояния', () => {
    const sources: UpdateCheckState[] = ['idle', 'notFound', 'offline', 'failed'];
    for (const current of sources) {
      expect(nextUpdateCheckState({ current, event: 'checkStarted' })).toBe('checking');
    }
  });

  it('исходы проверки переводят checking в соответствующее состояние', () => {
    expect(nextUpdateCheckState({ current: 'checking', event: 'checkOffline' })).toBe('offline');
    expect(nextUpdateCheckState({ current: 'checking', event: 'checkFailed' })).toBe('failed');
    expect(nextUpdateCheckState({ current: 'checking', event: 'checkTimedOut' })).toBe('notFound');
  });

  it('updateFound выигрывает у любого состояния', () => {
    const sources: UpdateCheckState[] = [
      'idle', 'checking', 'notFound', 'offline', 'failed', 'updateReady',
    ];
    for (const current of sources) {
      expect(nextUpdateCheckState({ current, event: 'updateFound' })).toBe('updateReady');
    }
  });

  it('updateReady терминально: обычные события его не сбрасывают', () => {
    expect(nextUpdateCheckState({ current: 'updateReady', event: 'noticeExpired' })).toBe('updateReady');
    expect(nextUpdateCheckState({ current: 'updateReady', event: 'checkTimedOut' })).toBe('updateReady');
    expect(nextUpdateCheckState({ current: 'updateReady', event: 'checkFailed' })).toBe('updateReady');
    expect(nextUpdateCheckState({ current: 'updateReady', event: 'checkOffline' })).toBe('updateReady');
  });

  it('noticeExpired гасит сообщающие состояния в idle', () => {
    expect(nextUpdateCheckState({ current: 'notFound', event: 'noticeExpired' })).toBe('idle');
    expect(nextUpdateCheckState({ current: 'offline', event: 'noticeExpired' })).toBe('idle');
    expect(nextUpdateCheckState({ current: 'failed', event: 'noticeExpired' })).toBe('idle');
  });

  it('noticeExpired не трогает idle и checking', () => {
    expect(nextUpdateCheckState({ current: 'idle', event: 'noticeExpired' })).toBe('idle');
    expect(nextUpdateCheckState({ current: 'checking', event: 'noticeExpired' })).toBe('checking');
  });

  it('исходы проверки игнорируются вне checking', () => {
    expect(nextUpdateCheckState({ current: 'idle', event: 'checkTimedOut' })).toBe('idle');
    expect(nextUpdateCheckState({ current: 'notFound', event: 'checkFailed' })).toBe('notFound');
  });

  it('NOTICE_STATES содержит ровно три сообщающих состояния', () => {
    expect(NOTICE_STATES.has('notFound')).toBe(true);
    expect(NOTICE_STATES.has('offline')).toBe(true);
    expect(NOTICE_STATES.has('failed')).toBe(true);
    expect(NOTICE_STATES.has('idle')).toBe(false);
    expect(NOTICE_STATES.has('checking')).toBe(false);
    expect(NOTICE_STATES.has('updateReady')).toBe(false);
    expect(NOTICE_STATES.size).toBe(3);
  });
});
