# Кнопка «Проверить обновления» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать игроку кнопку в настройках, которая принудительно спрашивает сервер о новой версии приложения.

**Architecture:** Логика переходов состояний выносится в чистую функцию (`updateCheckState.ts`), побочные эффекты (`navigator.onLine`, `registration.update()`, таймеры) живут в хуке `appUpdate.ts`, компонент `SettingsScreen` только рендерит. Одна кнопка меняет роль в зависимости от состояния; наружу хук отдаёт один обработчик.

**Tech Stack:** React 19, TypeScript, Vite, `vite-plugin-pwa` (`virtual:pwa-register/react`), Vitest + Testing Library, CSS Modules.

**Спека:** [2026-07-19-manual-update-check-design.md](../specs/2026-07-19-manual-update-check-design.md)

## Global Constraints

- **Язык UI — русский.** Подписи кнопки строго: `Проверить обновления`, `Проверяем…`, `Обновить`, `Обновлений не найдено`, `Нет соединения`, `Не удалось проверить`. В «Проверяем…» — символ многоточия `…`, не три точки.
- **`data-testid` обязателен** для выбора элементов в тестах. Существующий id кнопки — `update-app` — **не меняется**.
- **Никаких вложенных тернарников и цепочек `if`/`switch`** при диспетчеризации по состоянию — только лукап-мапы (`Record`).
- **Описательные имена**, без сокращений вроде `reg`, `st`, `ev`.
- **Объектные параметры** для функций с 3+ параметрами, либо с 2 параметрами одного типа.
- **Таймауты:** окно ожидания проверки — **10000 мс**, автосброс сообщающих состояний — **4000 мс**.
- **Публичный API `AppUpdateApi` расширяется, не ломается:** поля `updateAvailable` и `applyUpdate` остаются — на них живёт `UpdateBanner`, который в этом плане не трогаем.
- Тесты запускаются `npm test`, проверка типов — `npm run type-check`.

## File Structure

| Файл | Ответственность |
|---|---|
| `src/state/updateCheckState.ts` | **Создать.** Типы состояний/событий, чистая функция переходов. Без React и SW. |
| `src/state/updateCheckState.test.ts` | **Создать.** Юнит-тесты переходов. |
| `src/state/appUpdate.ts` | **Изменить.** Состояние, эффекты, таймеры, `registration.update()`. |
| `src/components/settings/SettingsScreen.tsx` | **Изменить.** Рендер кнопки по состоянию. |
| `src/components/settings/SettingsScreen.test.tsx` | **Изменить.** Тесты подписи и `disabled`. |
| `docs/adr/0004-pwa-update-strategy.md` | **Изменить.** Раздел про ручную проверку. |
| `docs/roadmap.md` | **Изменить.** Статус фичи. |

CSS не трогаем: класс `.updateButton` и `.updateButton:disabled` в `SettingsScreen.module.css` уже покрывают все состояния.

---

### Task 1: Чистая функция переходов состояний

**Files:**
- Create: `src/state/updateCheckState.ts`
- Test: `src/state/updateCheckState.test.ts`

**Interfaces:**
- Consumes: ничего (первая задача).
- Produces:
  - `type UpdateCheckState = 'idle' | 'checking' | 'updateReady' | 'notFound' | 'offline' | 'failed'`
  - `type UpdateCheckEvent = 'checkStarted' | 'checkOffline' | 'checkFailed' | 'checkTimedOut' | 'updateFound' | 'noticeExpired'`
  - `function nextUpdateCheckState(args: { current: UpdateCheckState; event: UpdateCheckEvent }): UpdateCheckState`
  - `const NOTICE_STATES: ReadonlySet<UpdateCheckState>` — состояния, которые сами гаснут в `idle`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/state/updateCheckState.test.ts`:

```ts
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
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npm test -- src/state/updateCheckState.test.ts`
Expected: FAIL — `Failed to resolve import "./updateCheckState"`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `src/state/updateCheckState.ts`:

```ts
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
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npm test -- src/state/updateCheckState.test.ts`
Expected: PASS, 8 тестов.

- [ ] **Step 5: Проверить типы**

Run: `npm run type-check`
Expected: без ошибок.

- [ ] **Step 6: Коммит**

```bash
git add src/state/updateCheckState.ts src/state/updateCheckState.test.ts
git commit -m "feat: чистая функция переходов состояний проверки обновлений"
```

---

### Task 2: Расширить хук `useAppUpdate`

**Files:**
- Modify: `src/state/appUpdate.ts` (сейчас 28 строк, переписывается целиком)

**Interfaces:**
- Consumes: `nextUpdateCheckState`, `NOTICE_STATES`, `UpdateCheckState` из Task 1.
- Produces: расширенный `AppUpdateApi`:
  ```ts
  interface AppUpdateApi {
    updateAvailable: boolean;
    applyUpdate: () => void;
    checkState: UpdateCheckState;
    handleVersionAction: () => void;
  }
  ```

**Почему без юнит-теста на сам хук:** вся логика переходов покрыта в Task 1, а
эффекты (`registration.update()`, таймеры, `navigator.onLine`) требуют мока
`virtual:pwa-register/react` и фейковых таймеров — по спеке решено этого не делать.
Хук остаётся тонкой обёрткой. Проверка — через `npm run type-check` и тесты Task 3.

- [ ] **Step 1: Переписать `src/state/appUpdate.ts`**

Полное содержимое файла:

```ts
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

  // Обновление может быть найдено и само, без нажатия кнопки, — синхронизируем.
  useEffect(() => {
    if (!updateAvailable) return;
    clearCheckTimer();
    dispatchCheckEvent('updateFound');
  }, [updateAvailable, dispatchCheckEvent]);

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
    if (checkState === 'updateReady') {
      applyUpdate();
      return;
    }
    startCheck();
  }, [checkState, applyUpdate, startCheck]);

  return { updateAvailable, applyUpdate, checkState, handleVersionAction };
}
```

- [ ] **Step 2: Проверить типы**

Run: `npm run type-check`
Expected: без ошибок.

- [ ] **Step 3: Убедиться, что существующие тесты не сломались**

Run: `npm test`
Expected: PASS, без правок в существующих тестах.

Почему ничего не ломается:
- `src/state/appUpdate.test.ts:10` мокает `useRegisterSW: () => ({...})` — стрелка без
  параметров молча игнорирует переданный объект с `onRegisteredSW`. В JS это законно,
  TypeScript в тесте тоже не возражает. Колбэк просто не вызовется, `registrationRef`
  останется `null`. Оба существующих теста проверяют только `updateAvailable` и
  `applyUpdate` — они не затрагивают ручную проверку, поэтому проходят как есть.
- `UpdateBanner.test.tsx` и `SettingsScreen.test.tsx` мокают `useAppUpdate` целиком.

Новых тестов на хук здесь не добавляем — см. пояснение в шапке задачи.

- [ ] **Step 4: Коммит**

```bash
git add src/state/appUpdate.ts src/state/appUpdate.test.ts
git commit -m "feat: ручная проверка обновлений в useAppUpdate"
```

---

### Task 3: Кнопка в настройках

**Files:**
- Modify: `src/components/settings/SettingsScreen.tsx:31` (вызов хука) и `:89-97` (кнопка)
- Test: `src/components/settings/SettingsScreen.test.tsx:16-20` (мок) и `:68-81` (тесты кнопки)

**Interfaces:**
- Consumes: `checkState`, `handleVersionAction` из Task 2; `UpdateCheckState` из Task 1.
- Produces: ничего для последующих задач.

- [ ] **Step 1: Обновить мок и написать падающие тесты**

В `src/components/settings/SettingsScreen.test.tsx` заменить блок мока (строки 16–20) на:

```ts
import type { UpdateCheckState } from '../../state/updateCheckState';

let updateAvailableValue = false;
let checkStateValue: UpdateCheckState = 'idle';
const applyUpdate = vi.fn();
const handleVersionAction = vi.fn();
vi.mock('../../state/appUpdate', () => ({
  useAppUpdate: () => ({
    updateAvailable: updateAvailableValue,
    applyUpdate,
    checkState: checkStateValue,
    handleVersionAction,
  }),
}));
```

В `beforeEach` (после `applyUpdate.mockClear();`) добавить:

```ts
  checkStateValue = 'idle';
  handleVersionAction.mockClear();
```

Заменить два существующих теста кнопки (строки 68–81) на:

```ts
  it('подпись кнопки соответствует состоянию проверки', () => {
    const expectedLabels: Array<[UpdateCheckState, string]> = [
      ['idle', 'Проверить обновления'],
      ['checking', 'Проверяем…'],
      ['updateReady', 'Обновить'],
      ['notFound', 'Обновлений не найдено'],
      ['offline', 'Нет соединения'],
      ['failed', 'Не удалось проверить'],
    ];
    for (const [state, label] of expectedLabels) {
      checkStateValue = state;
      renderSettings();
      expect(screen.getByTestId('update-app').textContent).toBe(label);
      cleanup();
    }
  });

  it('кнопка отключена только во время проверки', () => {
    checkStateValue = 'checking';
    renderSettings();
    expect(screen.getByTestId('update-app')).toBeDisabled();
    cleanup();

    checkStateValue = 'idle';
    renderSettings();
    expect(screen.getByTestId('update-app')).not.toBeDisabled();
  });

  it('клик по кнопке вызывает handleVersionAction', () => {
    checkStateValue = 'idle';
    renderSettings();
    fireEvent.click(screen.getByTestId('update-app'));
    expect(handleVersionAction).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Запустить тесты, убедиться что падают**

Run: `npm test -- src/components/settings/SettingsScreen.test.tsx`
Expected: FAIL — подпись всегда `Обновить`, кнопка задизейблена при `idle`.

- [ ] **Step 3: Обновить компонент**

В `src/components/settings/SettingsScreen.tsx` добавить импорт рядом с существующими:

```ts
import type { UpdateCheckState } from '../../state/updateCheckState';
```

Добавить лукап-мапу подписей после `GAME_TOGGLES` (строка 24):

```ts
const UPDATE_BUTTON_LABELS: Record<UpdateCheckState, string> = {
  idle: 'Проверить обновления',
  checking: 'Проверяем…',
  updateReady: 'Обновить',
  notFound: 'Обновлений не найдено',
  offline: 'Нет соединения',
  failed: 'Не удалось проверить',
};
```

Заменить строку 31:

```ts
  const { checkState, handleVersionAction } = useAppUpdate(() => game.state);
```

Добавить перед `return` (после функции `resetStats`):

```ts
  const updateButtonLabel = UPDATE_BUTTON_LABELS[checkState];
  const isCheckInProgress = checkState === 'checking';
```

Заменить кнопку (строки 89–97):

```tsx
          <button
            type="button"
            className={styles.updateButton}
            data-testid="update-app"
            disabled={isCheckInProgress}
            onClick={handleVersionAction}
          >
            {updateButtonLabel}
          </button>
```

- [ ] **Step 4: Запустить тесты, убедиться что проходят**

Run: `npm test -- src/components/settings/SettingsScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Полная проверка**

Run: `npm run type-check && npm run lint && npm test`
Expected: всё зелёное.

- [ ] **Step 6: Коммит**

```bash
git add src/components/settings/SettingsScreen.tsx src/components/settings/SettingsScreen.test.tsx
git commit -m "feat: кнопка «Проверить обновления» в настройках"
```

---

### Task 4: Документация

**Files:**
- Modify: `docs/adr/0004-pwa-update-strategy.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes: готовая реализация из Task 1–3.
- Produces: ничего.

- [ ] **Step 1: Дополнить ADR-0004**

В `docs/adr/0004-pwa-update-strategy.md` добавить перед разделом «## Последствия»:

```markdown
## Дополнение (2026-07-19): ручная проверка

Автоматическое обнаружение оставляет пробел: пока браузер не проверил `sw.js`,
игрок видит задизейбленную кнопку и не может ничего сделать. В standalone-режиме,
который редко закрывают полностью, проверка откладывается надолго.

Добавлена ручная проверка — та же кнопка в строке «Версия» меняет роль по состоянию
(`idle` → «Проверить обновления», `checking` → «Проверяем…», `updateReady` → «Обновить»)
и зовёт `registration.update()`. Три различимых исхода: «Нет соединения» (офлайн),
«Не удалось проверить» (запрос упал), «Обновлений не найдено» (10 с без `needRefresh`).

Формулировка «Обновлений не найдено», а не «Актуальная версия»: `update()` не сообщает
результат, поэтому по таймауту нельзя утверждать, что новой версии нет — она могла не
успеть скачаться. Спека: [manual-update-check](../superpowers/specs/2026-07-19-manual-update-check-design.md).
```

- [ ] **Step 2: Обновить роадмап**

В `docs/roadmap.md` в строке «Кнопка «Проверить обновления» в настройках» заменить
`📋 запланировано` на `✅ готово`, в колонке «Ветка / PR» поставить `feat/manual-update-check`,
в колонке «Завершено» — `2026-07-19`.

- [ ] **Step 3: Коммит**

```bash
git add docs/adr/0004-pwa-update-strategy.md docs/roadmap.md
git commit -m "docs: ручная проверка обновлений в ADR-0004 и роадмапе"
```

---

## Проверка вручную (после Task 3)

SW не работает в dev-режиме, поэтому проверять нужно на прод-сборке:

```bash
npm run build && npm run preview
```

1. Открыть preview, дождаться регистрации SW (DevTools → Application → Service Workers).
2. Нажать «Проверить обновления» → «Проверяем…» → через ~10 с «Обновлений не найдено» → через 4 с снова «Проверить обновления».
3. DevTools → Network → Offline, нажать кнопку → сразу «Нет соединения».
4. Не закрывая вкладку: изменить что-нибудь в `src/`, снова `npm run build`, нажать кнопку → должно появиться «Обновить». Нажать → страница перезагружается с новой версией.
