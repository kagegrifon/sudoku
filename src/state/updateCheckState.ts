/**
 * Состояния строки «Версия» в настройках. Взаимоисключающие, поэтому один union,
 * а не набор булевых флагов. См. спеку 2026-07-19-manual-update-check-design.md.
 */
export type UpdateCheckState =
  | 'idle'
  | 'checking'
  | 'updateReady'
  | 'notFound'
  | 'offline'
  | 'failed';

export type UpdateCheckEvent =
  | 'checkStarted'
  | 'checkOffline'
  | 'checkFailed'
  | 'checkTimedOut'
  | 'updateFound'
  | 'noticeExpired';

/** Состояния-сообщения: показываются недолго и сами гаснут в `idle`. */
export const NOTICE_STATES: ReadonlySet<UpdateCheckState> = new Set<UpdateCheckState>([
  'notFound',
  'offline',
  'failed',
]);

/** Исходы запущенной проверки — применимы только к `checking`. */
const CHECK_OUTCOMES: Partial<Record<UpdateCheckEvent, UpdateCheckState>> = {
  checkOffline: 'offline',
  checkFailed: 'failed',
  checkTimedOut: 'notFound',
};

interface NextStateArgs {
  current: UpdateCheckState;
  event: UpdateCheckEvent;
}

/**
 * Переход состояния строки «Версия».
 *
 * Правила: `updateReady` терминально (обновление найдено — кнопка остаётся
 * «Обновить»), но само событие `updateFound` выигрывает у любого состояния —
 * фоновое обнаружение может прийти, пока показывается «Обновлений не найдено».
 */
export function nextUpdateCheckState({ current, event }: NextStateArgs): UpdateCheckState {
  if (event === 'updateFound') return 'updateReady';
  if (current === 'updateReady') return 'updateReady';

  if (event === 'checkStarted') return 'checking';

  if (event === 'noticeExpired') {
    return NOTICE_STATES.has(current) ? 'idle' : current;
  }

  const outcome = CHECK_OUTCOMES[event];
  if (outcome && current === 'checking') return outcome;

  return current;
}
