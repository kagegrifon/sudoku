import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { saveGame } from './storage/localGame';
import {
  nextUpdateCheckState,
  NOTICE_STATES,
  type UpdateCheckEvent,
  type UpdateCheckState,
} from './updateCheckState';
import type { GameState } from './gameTypes';

/** Сколько ждём появления `needRefresh` после `registration.update()`. */
const CHECK_TIMEOUT_MS = 10_000;
/** Сколько показываем «Обновлений не найдено» / «Нет соединения» / ошибку. */
const NOTICE_TIMEOUT_MS = 4_000;

export interface AppUpdateApi {
  updateAvailable: boolean;
  applyUpdate: () => void;
  checkState: UpdateCheckState;
  handleVersionAction: () => void;
}

/**
 * Обёртка над virtual:pwa-register (ADR-0004, registerType: 'prompt').
 * `getGameState` прокидывает владелец (компонент с доступом к useGame), чтобы хук
 * оставался тестируемым без GameProvider. `applyUpdate` форсирует flush партии в
 * localStorage до перезагрузки — иначе последний ход (debounce-сохранение) потеряется.
 *
 * Помимо автоматического обнаружения обновления даёт ручную проверку
 * (`handleVersionAction`): кнопка в настройках зовёт `registration.update()`.
 */
export function useAppUpdate(getGameState: () => GameState): AppUpdateApi {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [checkState, setCheckState] = useState<UpdateCheckState>('idle');

  const {
    needRefresh: [updateAvailable],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_swUrl, registration) => {
      registrationRef.current = registration ?? null;
    },
  });

  const clearCheckTimer = () => {
    if (checkTimerRef.current !== null) {
      clearTimeout(checkTimerRef.current);
      checkTimerRef.current = null;
    }
  };

  const dispatchCheckEvent = useCallback((event: UpdateCheckEvent) => {
    setCheckState((current) => nextUpdateCheckState({ current, event }));
  }, []);

  // `updateAvailable` — внешний сигнал (не независимое состояние), поэтому не зеркалим
  // его в checkState через эффект, а выводим итоговое состояние прямо при рендере.
  const effectiveCheckState = updateAvailable
    ? nextUpdateCheckState({ current: checkState, event: 'updateFound' })
    : checkState;

  // Таймер проверки всё ещё нужно погасить, когда обновление найдено, — иначе
  // повиснет до 10 секунд. Это работа с внешней системой (таймером), не setState.
  useEffect(() => {
    if (!updateAvailable) return;
    clearCheckTimer();
  }, [updateAvailable]);

  // Сообщающие состояния гаснут обратно в idle.
  useEffect(() => {
    if (!NOTICE_STATES.has(checkState)) return;
    noticeTimerRef.current = setTimeout(() => {
      dispatchCheckEvent('noticeExpired');
    }, NOTICE_TIMEOUT_MS);
    return () => {
      if (noticeTimerRef.current !== null) {
        clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
    };
  }, [checkState, dispatchCheckEvent]);

  // Игрок может уйти с настроек во время проверки — гасим висящий таймер.
  useEffect(() => clearCheckTimer, []);

  const applyUpdate = useCallback(() => {
    saveGame(getGameState());
    void updateServiceWorker(true);
  }, [getGameState, updateServiceWorker]);

  const startCheck = useCallback(() => {
    if (!navigator.onLine) {
      dispatchCheckEvent('checkStarted');
      dispatchCheckEvent('checkOffline');
      return;
    }

    const registration = registrationRef.current;
    if (registration === null) {
      dispatchCheckEvent('checkStarted');
      dispatchCheckEvent('checkFailed');
      return;
    }

    dispatchCheckEvent('checkStarted');
    clearCheckTimer();
    checkTimerRef.current = setTimeout(() => {
      checkTimerRef.current = null;
      dispatchCheckEvent('checkTimedOut');
    }, CHECK_TIMEOUT_MS);

    registration.update().catch(() => {
      clearCheckTimer();
      dispatchCheckEvent('checkFailed');
    });
  }, [dispatchCheckEvent]);

  const handleVersionAction = useCallback(() => {
    if (effectiveCheckState === 'updateReady') {
      applyUpdate();
      return;
    }
    startCheck();
  }, [effectiveCheckState, applyUpdate, startCheck]);

  return { updateAvailable, applyUpdate, checkState: effectiveCheckState, handleVersionAction };
}
