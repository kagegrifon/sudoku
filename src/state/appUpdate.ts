import { useRegisterSW } from 'virtual:pwa-register/react';
import { saveGame } from './storage/localGame';
import type { GameState } from './gameTypes';

export interface AppUpdateApi {
  updateAvailable: boolean;
  applyUpdate: () => void;
}

/**
 * Обёртка над virtual:pwa-register (ADR-0004, registerType: 'prompt').
 * `getGameState` прокидывает владелец (компонент с доступом к useGame), чтобы хук
 * оставался тестируемым без GameProvider. `applyUpdate` форсирует flush партии в
 * localStorage до перезагрузки — иначе последний ход (debounce-сохранение) потеряется.
 */
export function useAppUpdate(getGameState: () => GameState): AppUpdateApi {
  const {
    needRefresh: [updateAvailable],
    updateServiceWorker,
  } = useRegisterSW();

  const applyUpdate = () => {
    saveGame(getGameState());
    void updateServiceWorker(true);
  };

  return { updateAvailable, applyUpdate };
}
