# Фаза 7: PWA-полировка + механизм обновления — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить иконки-плейсхолдеры на финальные, оживить заглушку кнопки «Обновить» в настройках и добавить независимые оверлеи UpdateBanner и InstallPrompt — не трогая замороженный дизайн из коммита #7.

**Architecture:** Тестируемое ядро (чистые функции `isIosSafari`, хук `useAppUpdate` поверх `virtual:pwa-register/react`) отделено от тонких UI-оверлеев (`UpdateBanner`, `InstallPrompt`). Оверлеи монтируются в `App.tsx` как сиблинги активного экрана внутри `GameProvider`. Существующий дизайн (экраны, навигация, тема, Header) не меняется — точечно подключается только заглушка `update-app` в `SettingsScreen`.

**Tech Stack:** TypeScript, React 18, Vite, `vite-plugin-pwa@^1.3.0` (`virtual:pwa-register/react` → `useRegisterSW`), CSS Modules, Vitest + @testing-library/react (jsdom-прагма пофайлово).

## Global Constraints

- **Ветка:** `feat/phase-7-pwa-polish` (уже создана; НЕ работать в `main`).
- **Коммит на задачу**, формат CLAUDE.md: `<type>: <описание>`, русский императив; сообщение заканчивать `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Дизайн заморожен:** не переверстывать экраны, не менять навигацию/тему, НЕ трогать `Header`, `SCREENS`-мапу, порядок провайдеров, `APP_VERSION`, `SETTINGS_SCHEMA_VERSION` (миграция v2→v3 НЕ нужна — `iosInstallPromptDismissed` уже есть).
- **Читаемость (CLAUDE.md):** без вложенных тернарников, описательные имена, options-объект при 3+ параметрах, flat JSX, lookup-мапы вместо `if`/`switch`-цепочек.
- **E2E/тесты:** UI-элементы выбирать только по `data-testid`.
- **Тесты компонентов:** первая строка файла — `// @vitest-environment jsdom` (env по умолчанию `node`).
- **`useRegisterSW` API:** возвращает `needRefresh: [boolean, Dispatch<SetStateAction<boolean>>]` (кортеж!), `offlineReady: [...]`, `updateServiceWorker(reloadPage?: boolean): Promise<void>`.
- **theme_color/background_color:** светлая палитра `tokens.css` — `#2f6fed` / `#eef1f7`.
- **Источник истины:** [спека Фазы 7](../specs/2026-07-14-phase-7-pwa-polish-design.md), [design §4–5](../specs/2026-07-02-sudoku-pwa-design.md), [ADR-0004](../../adr/0004-pwa-update-strategy.md).

---

## Файловая структура

**Создать:**
- `src/state/installDetect.ts` — чистые `isIosSafari(userAgent)`, `isStandaloneDisplay()`.
- `src/state/installDetect.test.ts` — юниты детекта.
- `src/state/appUpdate.ts` — хук `useAppUpdate(getGameState)`.
- `src/state/appUpdate.test.ts` — юниты хука (мок `virtual:pwa-register/react`).
- `src/components/update/UpdateBanner.tsx` + `UpdateBanner.module.css` — оверлей обновления.
- `src/components/install/InstallPrompt.tsx` + `InstallPrompt.module.css` — оверлей установки.

**Изменить:**
- `public/icons/*` — заменить иконки на файлы из `design/icons/`.
- `vite.config.ts` — theme_color/background_color.
- `src/components/home/HomeScreen.tsx` — `ICON_URL` на rounded.
- `src/state/SettingsContext.tsx` — метод `dismissIosInstallPrompt()`.
- `src/components/settings/SettingsScreen.tsx` — подключить `useAppUpdate` к `update-app`.
- `src/components/settings/SettingsScreen.test.tsx` — заменить тест «заглушка» на тесты активной кнопки.
- `src/App.tsx` — смонтировать `UpdateBanner` + `InstallPrompt`.
- `src/App.test.tsx` — добавить моки `virtual:pwa-register/react` и `matchMedia`.

---

## Task 1: Иконки и манифест

Замена иконок-плейсхолдеров на финальные + согласование палитры манифеста + rounded-логотип на стартовом экране. Одна логически целостная правка конфигурации/ассетов, тестов не требует (проверяется вручную через DevTools в конце).

**Files:**
- Modify (replace binaries): `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png`, `public/icons/apple-touch-icon.png`
- Create (binary): `public/icons/icon-rounded-512.png`
- Modify: `vite.config.ts:18-19` (theme_color/background_color)
- Modify: `src/components/home/HomeScreen.tsx:11` (ICON_URL)

**Interfaces:**
- Consumes: файлы `design/icons/*.png`.
- Produces: `public/icons/icon-rounded-512.png` (используется `HomeScreen`).

- [ ] **Step 1: Скопировать финальные иконки из design/icons в public/icons**

Bash (перезаписывает 4 плейсхолдера + добавляет rounded):

```bash
cp design/icons/icon-192.png          public/icons/icon-192.png
cp design/icons/icon-512.png          public/icons/icon-512.png
cp design/icons/maskable-512.png      public/icons/maskable-512.png
cp design/icons/apple-touch-icon.png  public/icons/apple-touch-icon.png
cp design/icons/icon-rounded-512.png  public/icons/icon-rounded-512.png
```

- [ ] **Step 2: Проверить, что все 5 файлов на месте**

Run: `ls public/icons/`
Expected: `apple-touch-icon.png  icon-192.png  icon-512.png  icon-rounded-512.png  maskable-512.png`

- [ ] **Step 3: Согласовать theme_color/background_color манифеста со светлой палитрой**

В `vite.config.ts` заменить строки:

```ts
        theme_color: '#1e293b',
        background_color: '#ffffff',
```

на:

```ts
        theme_color: '#2f6fed',
        background_color: '#eef1f7',
```

(Иконки в `manifest.icons` и `includeAssets` НЕ трогать; `icon-rounded-512.png` в манифест не добавляется — это внутренний UI-логотип. `orientation` не фиксировать.)

- [ ] **Step 4: Подключить rounded-логотип на стартовом экране**

В `src/components/home/HomeScreen.tsx` заменить строку 11:

```ts
const ICON_URL = '/icons/icon-512.png';
```

на:

```ts
const ICON_URL = '/icons/icon-rounded-512.png';
```

(Вёрстку/классы `HomeScreen` не менять — только константу URL.)

- [ ] **Step 5: Проверить типы и сборку (иконки участвуют в precache манифеста)**

Run: `npm run type-check && npm run build`
Expected: без ошибок; в выводе build — сгенерированный `manifest.webmanifest` и precache иконок.

- [ ] **Step 6: Commit**

```bash
git add public/icons vite.config.ts src/components/home/HomeScreen.tsx
git commit -m "feat: финальные иконки PWA и светлая палитра манифеста

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `installDetect` — детект iOS Safari и standalone

Чистая тестируемая логика детекта платформы для InstallPrompt. Полностью юнит-покрывается, от DOM не зависит (кроме тонкой обёртки `isStandaloneDisplay`).

**Files:**
- Create: `src/state/installDetect.ts`
- Test: `src/state/installDetect.test.ts`

**Interfaces:**
- Produces:
  - `isIosSafari(userAgent: string): boolean` — true только для iOS Safari.
  - `isStandaloneDisplay(): boolean` — обёртка `window.matchMedia('(display-mode: standalone)').matches`.

- [ ] **Step 1: Написать падающий тест детекта**

Create `src/state/installDetect.test.ts`:

```ts
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
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- installDetect`
Expected: FAIL — «Failed to resolve import "./installDetect"» / `isIosSafari is not a function`.

- [ ] **Step 3: Реализовать installDetect**

Create `src/state/installDetect.ts`:

```ts
// Другие iOS-браузеры используют движок WebKit, но помечают себя своими токенами.
// Их надо исключить: install-инструкция «Поделиться → На экран» верна только для Safari.
const NON_SAFARI_IOS_TOKENS = ['CriOS', 'FxiOS', 'EdgiOS', 'OPiOS'];

/** true только для iOS/iPadOS Safari — по строке user-agent, без обращения к DOM. */
export function isIosSafari(userAgent: string): boolean {
  const isIosDevice = /iPhone|iPad|iPod/.test(userAgent);
  if (!isIosDevice) return false;
  const isSafariEngine = /Safari/.test(userAgent);
  if (!isSafariEngine) return false;
  const isOtherIosBrowser = NON_SAFARI_IOS_TOKENS.some((token) => userAgent.includes(token));
  return !isOtherIosBrowser;
}

/** Приложение уже запущено как установленное PWA (standalone). Обёртка над matchMedia для мокабельности. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- installDetect`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/state/installDetect.ts src/state/installDetect.test.ts
git commit -m "feat: детект iOS Safari и standalone для InstallPrompt

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `useAppUpdate` — хук обновления поверх virtual:pwa-register

Хук-обёртка над `useRegisterSW`. `applyUpdate` форсирует сохранение партии перед reload. Тестируется с мокнутым `virtual:pwa-register/react` — без реального Service Worker.

**Files:**
- Create: `src/state/appUpdate.ts`
- Test: `src/state/appUpdate.test.ts`

**Interfaces:**
- Consumes: `useRegisterSW` из `virtual:pwa-register/react` (`needRefresh: [boolean, ...]`, `updateServiceWorker(reload?): Promise<void>`); `saveGame(state)` из `./storage/localGame`; тип `GameState` из `./gameTypes`.
- Produces:
  - `interface AppUpdateApi { updateAvailable: boolean; applyUpdate: () => void }`
  - `useAppUpdate(getGameState: () => GameState): AppUpdateApi`

- [ ] **Step 1: Написать падающий тест хука**

Create `src/state/appUpdate.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Управляемые из теста значения хука useRegisterSW.
const updateServiceWorker = vi.fn().mockResolvedValue(undefined);
let needRefreshValue = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefreshValue, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

const saveGame = vi.fn();
vi.mock('./storage/localGame', () => ({
  saveGame: (state: unknown) => saveGame(state),
}));

import { useAppUpdate } from './appUpdate';
import type { GameState } from './gameTypes';

const FAKE_STATE = { puzzleId: 'p1', status: 'paused' } as unknown as GameState;

beforeEach(() => {
  updateServiceWorker.mockClear();
  saveGame.mockClear();
  needRefreshValue = false;
});

describe('useAppUpdate', () => {
  it('updateAvailable отражает needRefresh', () => {
    needRefreshValue = true;
    const { result } = renderHook(() => useAppUpdate(() => FAKE_STATE));
    expect(result.current.updateAvailable).toBe(true);
  });

  it('applyUpdate сохраняет партию, затем вызывает updateServiceWorker(true)', () => {
    const { result } = renderHook(() => useAppUpdate(() => FAKE_STATE));
    act(() => {
      result.current.applyUpdate();
    });
    expect(saveGame).toHaveBeenCalledWith(FAKE_STATE);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    // Сохранение — до перезагрузки.
    expect(saveGame.mock.invocationCallOrder[0]).toBeLessThan(
      updateServiceWorker.mock.invocationCallOrder[0],
    );
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- appUpdate`
Expected: FAIL — «Failed to resolve import "./appUpdate"».

- [ ] **Step 3: Реализовать useAppUpdate**

Create `src/state/appUpdate.ts`:

```ts
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
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- appUpdate`
Expected: PASS (2 теста).

- [ ] **Step 5: Проверить типы (virtual:pwa-register/react разрешается через vite-plugin-pwa/react.d.ts)**

Run: `npm run type-check`
Expected: без ошибок. Если TS не видит `virtual:pwa-register/react` — убедиться, что `vite-plugin-pwa/client` подтянут через `vite/client` типы; при ошибке добавить `/// <reference types="vite-plugin-pwa/react" />` в `src/vite-env.d.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/state/appUpdate.ts src/state/appUpdate.test.ts
git commit -m "feat: хук useAppUpdate с flush партии перед обновлением SW

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `dismissIosInstallPrompt` в SettingsContext

Узкий метод для одноразового флага `iosInstallPromptDismissed` (не тумблер, потому не через `toggle`/`SettingsFlag`). Малое аддитивное расширение состояния.

**Files:**
- Modify: `src/state/SettingsContext.tsx`
- Test: `src/state/SettingsContext.test.tsx` (создать, если отсутствует; см. шаг 1)

**Interfaces:**
- Consumes: существующий `setSettings` (внутренний), `Settings.iosInstallPromptDismissed`.
- Produces: `SettingsApi.dismissIosInstallPrompt(): void` — ставит `iosInstallPromptDismissed = true`.

- [ ] **Step 1: Написать падающий тест метода**

Create `src/state/SettingsContext.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SettingsProvider, useSettings } from './SettingsContext';

function wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe('SettingsContext.dismissIosInstallPrompt', () => {
  it('по умолчанию iosInstallPromptDismissed = false', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings.iosInstallPromptDismissed).toBe(false);
  });

  it('dismissIosInstallPrompt ставит флаг в true', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => {
      result.current.dismissIosInstallPrompt();
    });
    expect(result.current.settings.iosInstallPromptDismissed).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- SettingsContext`
Expected: FAIL — `result.current.dismissIosInstallPrompt is not a function`.

- [ ] **Step 3: Добавить метод в SettingsApi и реализацию**

В `src/state/SettingsContext.tsx` добавить в интерфейс `SettingsApi` (после `setTheme`/`toggle`):

```ts
  dismissIosInstallPrompt(): void;
```

и в объект `api` внутри `useMemo` (рядом с `toggle`):

```ts
      dismissIosInstallPrompt: () =>
        setSettings((prev) => ({ ...prev, iosInstallPromptDismissed: true })),
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- SettingsContext`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add src/state/SettingsContext.tsx src/state/SettingsContext.test.tsx
git commit -m "feat: метод dismissIosInstallPrompt в SettingsContext

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Активировать кнопку «Обновить» в SettingsScreen

Убрать заглушку `disabled`, подключить `useAppUpdate`. Кнопка активна только когда `updateAvailable`. Вёрстку не менять.

**Files:**
- Modify: `src/components/settings/SettingsScreen.tsx:2-10, 85-88`
- Modify: `src/components/settings/SettingsScreen.test.tsx:56-59` (заменить тест «заглушка»)

**Interfaces:**
- Consumes: `useAppUpdate(getGameState)` из `../../state/appUpdate`; `useGame()` из `../../state/GameContext` (даёт `state` для `getGameState`).
- Produces: кнопка `data-testid="update-app"` с `disabled === !updateAvailable`, `onClick = applyUpdate`.

- [ ] **Step 1: Обновить тесты SettingsScreen под активную кнопку**

В `src/components/settings/SettingsScreen.test.tsx`:

Добавить в начало (после существующего `vi.mock('../../state/storage/historyDb', ...)`) управляемый мок хука и мок GameContext (SettingsScreen теперь читает `useGame`):

```ts
let updateAvailableValue = false;
const applyUpdate = vi.fn();
vi.mock('../../state/appUpdate', () => ({
  useAppUpdate: () => ({ updateAvailable: updateAvailableValue, applyUpdate }),
}));

vi.mock('../../state/GameContext', () => ({
  useGame: () => ({ state: { puzzleId: 'p1', status: 'paused' } }),
}));
```

Добавить сброс в `beforeEach` (рядом с `localStorage.clear()`):

```ts
  updateAvailableValue = false;
  applyUpdate.mockClear();
```

Заменить существующий тест `'кнопка «Обновить» — заглушка (disabled)'` (строки 56-59) на:

```ts
  it('кнопка «Обновить» отключена, когда обновление недоступно', () => {
    updateAvailableValue = false;
    renderSettings();
    expect(screen.getByTestId('update-app')).toBeDisabled();
  });

  it('кнопка «Обновить» активна и вызывает applyUpdate, когда обновление доступно', () => {
    updateAvailableValue = true;
    renderSettings();
    const button = screen.getByTestId('update-app');
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Запустить тесты — убедиться, что новый (активная кнопка) падает**

Run: `npm test -- SettingsScreen`
Expected: FAIL — кнопка всё ещё жёстко `disabled`, `applyUpdate` не вызывается.

- [ ] **Step 3: Подключить useAppUpdate в SettingsScreen**

В `src/components/settings/SettingsScreen.tsx` добавить импорты (после строки 3):

```ts
import { useGame } from '../../state/GameContext';
import { useAppUpdate } from '../../state/appUpdate';
```

В теле компонента (после `const records = useRecords();`):

```ts
  const game = useGame();
  const { updateAvailable, applyUpdate } = useAppUpdate(() => game.state);
```

Заменить блок кнопки (строки 85-88) с:

```tsx
          {/* TODO: ждёт фичи (PWA update) — сейчас кнопка ничего не делает. */}
          <button type="button" className={styles.updateButton} data-testid="update-app" disabled>
            Обновить
          </button>
```

на:

```tsx
          <button
            type="button"
            className={styles.updateButton}
            data-testid="update-app"
            disabled={!updateAvailable}
            onClick={applyUpdate}
          >
            Обновить
          </button>
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `npm test -- SettingsScreen`
Expected: PASS (все тесты, включая обе новые проверки кнопки).

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/SettingsScreen.tsx src/components/settings/SettingsScreen.test.tsx
git commit -m "feat: активировать кнопку «Обновить» в настройках при готовности обновления

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: UpdateBanner — независимый оверлей обновления

Всплывающий баннер «Доступно обновление» с кнопкой «Обновить» и крестиком. Владеет `useAppUpdate`, прокидывает `getGameState` из `useGame`. Локальный `dismissed` скрывает баннер, но `updateAvailable` остаётся true (тогда активна кнопка в настройках).

**Files:**
- Create: `src/components/update/UpdateBanner.tsx`
- Create: `src/components/update/UpdateBanner.module.css`
- Test: `src/components/update/UpdateBanner.test.tsx`

**Interfaces:**
- Consumes: `useAppUpdate(getGameState)`; `useGame()` (для `state`).
- Produces: компонент `UpdateBanner` (default export). testid: `update-banner`, `update-banner-apply`, `update-banner-dismiss`.

- [ ] **Step 1: Написать падающий тест баннера**

Create `src/components/update/UpdateBanner.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

let updateAvailableValue = false;
const applyUpdate = vi.fn();
vi.mock('../../state/appUpdate', () => ({
  useAppUpdate: () => ({ updateAvailable: updateAvailableValue, applyUpdate }),
}));

vi.mock('../../state/GameContext', () => ({
  useGame: () => ({ state: { puzzleId: 'p1', status: 'paused' } }),
}));

import UpdateBanner from './UpdateBanner';

beforeEach(() => {
  updateAvailableValue = false;
  applyUpdate.mockClear();
});
afterEach(cleanup);

describe('UpdateBanner', () => {
  it('скрыт, когда обновление недоступно', () => {
    render(<UpdateBanner />);
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });

  it('виден, когда обновление доступно', () => {
    updateAvailableValue = true;
    render(<UpdateBanner />);
    expect(screen.getByTestId('update-banner')).toBeInTheDocument();
  });

  it('кнопка «Обновить» вызывает applyUpdate', () => {
    updateAvailableValue = true;
    render(<UpdateBanner />);
    fireEvent.click(screen.getByTestId('update-banner-apply'));
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('крестик скрывает баннер (но не отменяет доступность обновления)', () => {
    updateAvailableValue = true;
    render(<UpdateBanner />);
    fireEvent.click(screen.getByTestId('update-banner-dismiss'));
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- UpdateBanner`
Expected: FAIL — «Failed to resolve import "./UpdateBanner"».

- [ ] **Step 3: Реализовать UpdateBanner**

Create `src/components/update/UpdateBanner.tsx`:

```tsx
import { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { useAppUpdate } from '../../state/appUpdate';
import styles from './UpdateBanner.module.css';

/**
 * Независимый оверлей (не экран дизайна). При готовности новой версии SW показывает
 * баннер. Крестик скрывает баннер локально, но updateAvailable остаётся true —
 * тогда обновиться можно кнопкой «Обновить» в настройках (design §5, ADR-0004).
 */
export default function UpdateBanner() {
  const game = useGame();
  const { updateAvailable, applyUpdate } = useAppUpdate(() => game.state);
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className={styles.banner} role="status" data-testid="update-banner">
      <span className={styles.text}>Доступно обновление</span>
      <button
        type="button"
        className={styles.apply}
        data-testid="update-banner-apply"
        onClick={applyUpdate}
      >
        Обновить
      </button>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Закрыть"
        data-testid="update-banner-dismiss"
        onClick={() => setDismissed(true)}
      >
        ✕
      </button>
    </div>
  );
}
```

Create `src/components/update/UpdateBanner.module.css`:

```css
.banner {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  z-index: 100;
  width: calc(100% - 32px);
  max-width: 388px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  box-sizing: border-box;
}

.text {
  flex: 1;
  font-size: 14px;
  color: var(--ink);
}

.apply {
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  border: 0;
  font-family: inherit;
  cursor: pointer;
}

.dismiss {
  border: 0;
  background: none;
  color: var(--ink-faint);
  font-size: 15px;
  line-height: 1;
  padding: 4px;
  cursor: pointer;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- UpdateBanner`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add src/components/update
git commit -m "feat: оверлей UpdateBanner (баннер обновления PWA)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: InstallPrompt — оверлей установки (Android + iOS)

Android: перехват `beforeinstallprompt`, кнопка «Установить». iOS Safari: текстовая инструкция, показ один раз через `iosInstallPromptDismissed`. Не показывать в standalone.

**Files:**
- Create: `src/components/install/InstallPrompt.tsx`
- Create: `src/components/install/InstallPrompt.module.css`
- Test: `src/components/install/InstallPrompt.test.tsx`

**Interfaces:**
- Consumes: `isIosSafari(userAgent)`, `isStandaloneDisplay()` из `../../state/installDetect`; `useSettings()` (`settings.iosInstallPromptDismissed`, `dismissIosInstallPrompt`).
- Produces: компонент `InstallPrompt` (default export). testid: `install-prompt`, `install-prompt-accept`, `install-prompt-dismiss`.

- [ ] **Step 1: Написать падающие тесты (iOS-инструкция и standalone-guard)**

Create `src/components/install/InstallPrompt.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

let iosSafariValue = false;
let standaloneValue = false;
vi.mock('../../state/installDetect', () => ({
  isIosSafari: () => iosSafariValue,
  isStandaloneDisplay: () => standaloneValue,
}));

const dismissIosInstallPrompt = vi.fn();
let iosDismissedValue = false;
vi.mock('../../state/SettingsContext', () => ({
  useSettings: () => ({
    settings: { iosInstallPromptDismissed: iosDismissedValue },
    dismissIosInstallPrompt,
  }),
}));

import InstallPrompt from './InstallPrompt';

beforeEach(() => {
  iosSafariValue = false;
  standaloneValue = false;
  iosDismissedValue = false;
  dismissIosInstallPrompt.mockClear();
});
afterEach(cleanup);

describe('InstallPrompt — iOS', () => {
  it('показывает iOS-инструкцию в Safari, когда ещё не закрыта', () => {
    iosSafariValue = true;
    render(<InstallPrompt />);
    expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
  });

  it('не показывает iOS-инструкцию, если уже закрыта', () => {
    iosSafariValue = true;
    iosDismissedValue = true;
    render(<InstallPrompt />);
    expect(screen.queryByTestId('install-prompt')).toBeNull();
  });

  it('крестик на iOS вызывает dismissIosInstallPrompt', () => {
    iosSafariValue = true;
    render(<InstallPrompt />);
    fireEvent.click(screen.getByTestId('install-prompt-dismiss'));
    expect(dismissIosInstallPrompt).toHaveBeenCalledTimes(1);
  });

  it('не показывает ничего в standalone-режиме', () => {
    iosSafariValue = true;
    standaloneValue = true;
    render(<InstallPrompt />);
    expect(screen.queryByTestId('install-prompt')).toBeNull();
  });

  it('не показывает ничего в обычном браузере без beforeinstallprompt', () => {
    render(<InstallPrompt />);
    expect(screen.queryByTestId('install-prompt')).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `npm test -- InstallPrompt`
Expected: FAIL — «Failed to resolve import "./InstallPrompt"».

- [ ] **Step 3: Реализовать InstallPrompt**

Create `src/components/install/InstallPrompt.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useSettings } from '../../state/SettingsContext';
import { isIosSafari, isStandaloneDisplay } from '../../state/installDetect';
import styles from './InstallPrompt.module.css';

// Событие Android-установки (не в стандартных типах DOM lib).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/**
 * Независимый оверлей установки. Android — нативный beforeinstallprompt + кнопка.
 * iOS Safari — текстовая инструкция один раз (флаг iosInstallPromptDismissed).
 * Ничего не показывает, если приложение уже установлено (standalone).
 */
export default function InstallPrompt() {
  const { settings, dismissIosInstallPrompt } = useSettings();
  const [androidPrompt, setAndroidPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [androidDismissed, setAndroidDismissed] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setAndroidPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (isStandaloneDisplay()) return null;

  const showAndroid = androidPrompt !== null && !androidDismissed;
  const showIos = isIosSafari(navigator.userAgent) && !settings.iosInstallPromptDismissed;

  if (showAndroid) {
    return (
      <div className={styles.prompt} role="dialog" data-testid="install-prompt">
        <span className={styles.text}>Установить приложение на устройство?</span>
        <button
          type="button"
          className={styles.accept}
          data-testid="install-prompt-accept"
          onClick={() => {
            void androidPrompt.prompt();
            setAndroidDismissed(true);
          }}
        >
          Установить
        </button>
        <button
          type="button"
          className={styles.dismiss}
          aria-label="Закрыть"
          data-testid="install-prompt-dismiss"
          onClick={() => setAndroidDismissed(true)}
        >
          ✕
        </button>
      </div>
    );
  }

  if (showIos) {
    return (
      <div className={styles.prompt} role="dialog" data-testid="install-prompt">
        <span className={styles.text}>
          Чтобы установить: нажмите «Поделиться», затем «На экран „Домой“».
        </span>
        <button
          type="button"
          className={styles.dismiss}
          aria-label="Закрыть"
          data-testid="install-prompt-dismiss"
          onClick={dismissIosInstallPrompt}
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
```

Create `src/components/install/InstallPrompt.module.css`:

```css
.prompt {
  position: fixed;
  left: 50%;
  top: 16px;
  transform: translateX(-50%);
  z-index: 100;
  width: calc(100% - 32px);
  max-width: 388px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  box-sizing: border-box;
}

.text {
  flex: 1;
  font-size: 14px;
  color: var(--ink);
}

.accept {
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  border: 0;
  font-family: inherit;
  cursor: pointer;
}

.dismiss {
  border: 0;
  background: none;
  color: var(--ink-faint);
  font-size: 15px;
  line-height: 1;
  padding: 4px;
  cursor: pointer;
}
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `npm test -- InstallPrompt`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/components/install
git commit -m "feat: оверлей InstallPrompt (Android beforeinstallprompt + iOS-инструкция)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Смонтировать оверлеи в App.tsx

Добавить `UpdateBanner` и `InstallPrompt` как сиблинги активного экрана внутри `GameProvider`. Обновить `App.test.tsx` моками, чтобы новые сиблинги не ломали существующие тесты навигации.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx:1-12` (добавить моки)

**Interfaces:**
- Consumes: `UpdateBanner` (default) из `./components/update/UpdateBanner`; `InstallPrompt` (default) из `./components/install/InstallPrompt`.
- Produces: —

- [ ] **Step 1: Добавить моки в App.test.tsx (иначе новые сиблинги обратятся к SW/matchMedia)**

В `src/App.test.tsx` добавить после существующего `vi.mock('./state/storage/historyDb', ...)` (перед `import App`):

```ts
// Новые оверлеи обращаются к SW-регистрации и matchMedia — мокаем для чистоты навигационных тестов.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.stubGlobal(
  'matchMedia',
  vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
);
```

- [ ] **Step 2: Запустить тесты App — убедиться, что зелёные с моками (детект регрессии)**

Run: `npm test -- src/App.test.tsx`
Expected: PASS (3 существующих теста) — моки на месте, но сами оверлеи ещё не смонтированы, регрессии нет.

- [ ] **Step 3: Смонтировать оверлеи в App.tsx**

В `src/App.tsx` добавить импорты (после строки 8):

```ts
import UpdateBanner from './components/update/UpdateBanner';
import InstallPrompt from './components/install/InstallPrompt';
```

Заменить блок рендера `GameProvider` (строки 28-32):

```tsx
          <GameProvider>
            <ActiveScreen />
          </GameProvider>
```

на:

```tsx
          <GameProvider>
            <ActiveScreen />
            <UpdateBanner />
            <InstallPrompt />
          </GameProvider>
```

(Порядок провайдеров и мапу `SCREENS` не менять.)

- [ ] **Step 4: Запустить тесты App — убедиться, что всё ещё зелёные**

Run: `npm test -- src/App.test.tsx`
Expected: PASS (3 теста) — оверлеи не показываются (`needRefresh=false`, `matchMedia.matches=false`, UA не iOS в jsdom), навигация цела.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: смонтировать UpdateBanner и InstallPrompt в App

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Полная верификация + роадмап + индекс фаз

Финальная проверка всей связки, обновление трекинга. Автотесты + типы + сборка; ручные проверки вынесены отдельным чек-листом (не автоматизируются).

**Files:**
- Modify: `docs/roadmap.md:21` (строка «PWA-полировка»)
- Modify: `docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md:32` (статус Фазы 7)

**Interfaces:** —

- [ ] **Step 1: Прогнать всю проверку**

Run: `npm run type-check && npm run lint && npm test && npm run build`
Expected: type-check без ошибок; lint 0 warnings; все тесты зелёные (включая новые: installDetect, appUpdate, SettingsContext, SettingsScreen, UpdateBanner, InstallPrompt, App); build успешен, `manifest.webmanifest` с новыми theme_color/иконками сгенерирован.

- [ ] **Step 2: Финальный проход читаемости (CLAUDE.md)**

Просмотреть diff: описательные имена (нет `s`/`p`/`mod`), нет вложенных тернарников, flat JSX, options-объект при 3+ параметрах, `data-testid` на всех интерактивных элементах оверлеев. Исправить найденное.

- [ ] **Step 3: Обновить роадмап**

В `docs/roadmap.md` строку «PWA-полировка (иконки, manifest, InstallPrompt iOS/Android, precache, офлайн) + механизм обновления»:
- статус `📋 запланировано` → `✅ готово`;
- «Ветка / PR» `—` → `feat/phase-7-pwa-polish`;
- «Завершено» `—` → `2026-07-14`.

- [ ] **Step 4: Отметить Фазу 7 в индексе планов**

В `docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md` строку Фазы 7:
- в колонке «План» вписать ссылку `[phase-7-pwa-polish.md](2026-07-14-phase-7-pwa-polish.md)`;
- «Статус детализации» `📋 детализировать перед стартом` → `✅ реализован (2026-07-14, feat/phase-7-pwa-polish)`.

- [ ] **Step 5: Commit трекинга**

```bash
git add docs/roadmap.md docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md
git commit -m "docs: отметить Фазу 7 (PWA-полировка) завершённой

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: Ручные проверки (не автотесты) — `npm run preview` + DevTools**

Запустить `npm run preview`, открыть в браузере, DevTools:

1. **Application → Manifest** — `name`/`short_name` «Судоку»; `theme_color` `#2f6fed`, `background_color` `#eef1f7`; иконки 192/512/maskable из design/icons отрисованы корректно, maskable без обрезки в safe-zone.
2. **Application → Service Workers** — SW зарегистрирован, precache-список включает иконки.
3. **Network → Offline** (галка) → перезагрузить → пройти по всем экранам (home / game / settings / stats) — приложение работает офлайн.
4. **Обновление:** собрать новую версию (изменить любой ассет, `npm run build` заново при живом preview / повторный деплой), дождаться `needRefresh` → появляется `UpdateBanner`; закрыть крестиком → кнопка `update-app` в настройках стала активной; нажать «Обновить» → партия сохранена, страница перезагрузилась на новую версию без потери прогресса.
5. **Мобильный эмулятор (DevTools device toolbar):**
   - Android UA → кнопка «Установить» из `beforeinstallprompt` (может потребовать реального Chrome/Android — если событие не триггерится в эмуляторе, отметить как проверку на устройстве);
   - iOS Safari UA (эмуляция) → текстовая инструкция `install-prompt`.
6. **Тема:** переключить system/light/dark в настройках — `UpdateBanner` и `InstallPrompt` корректно окрашиваются в обеих темах (фон `--card`, текст `--ink`, акцент `--accent`).

**Если что-то из ручных проверок стопорится** (SW не обновляется предсказуемо в preview, `beforeinstallprompt` не триггерится в браузере, эмулятор недоступен) — **остановиться и попросить пользователя** проверить на реальном устройстве / подтвердить поведение браузера / принять решение. Не обходить нестандартными средствами.

- [ ] **Step 7: Завершение ветки**

Использовать superpowers:finishing-a-development-branch для интеграции (merge / PR по выбору пользователя).

---

## Self-Review

**Spec coverage (спека Фазы 7 → задачи):**
- Иконки в public/icons + rounded в HomeScreen → Task 1. ✓
- theme_color/background_color светлая палитра → Task 1. ✓
- `useAppUpdate` (updateAvailable/applyUpdate, flush перед reload, getGameState-проброс) → Task 3. ✓
- `isIosSafari` + `isStandaloneDisplay` → Task 2. ✓
- `dismissIosInstallPrompt` в SettingsContext → Task 4. ✓
- Активация кнопки update-app (disabled === !updateAvailable) → Task 5. ✓
- UpdateBanner (testid update-banner/-apply/-dismiss, dismissed скрывает но не отменяет) → Task 6. ✓
- InstallPrompt (Android beforeinstallprompt, iOS-инструкция один раз, standalone-guard) → Task 7. ✓
- Монтаж в App.tsx рядом внутри GameProvider, SCREENS/провайдеры не тронуты → Task 8. ✓
- Юнит-тесты: isIosSafari (+негатив CriOS), видимость update-app от updateAvailable, applyUpdate дёргает saveGame+updateServiceWorker → Tasks 2/3/5. ✓
- Миграция v2→v3 НЕ нужна (спека §Фактическое состояние п.1) → задачи её не содержат. ✓
- Ручные проверки (Manifest, offline, update, install, тема) → Task 9 Step 6. ✓
- Роадмап + индекс → Task 9 Steps 3–4. ✓

**Placeholder scan:** нет TBD/TODO/«обработать ошибки»/«похоже на Task N» — весь код приведён целиком. ✓

**Type consistency:** `useAppUpdate(getGameState: () => GameState): AppUpdateApi { updateAvailable, applyUpdate }` — одинаково в Tasks 3/5/6. `needRefresh` разбирается как кортеж `[updateAvailable]` (Task 3) в соответствии с `react.d.ts`. `isIosSafari(userAgent)`/`isStandaloneDisplay()` — согласованы Tasks 2/7. `dismissIosInstallPrompt()` — Tasks 4/7. testid-имена совпадают со спекой. ✓

**Замечание по App.test.tsx (риск интеграции):** существующие тесты рендерят полный `App` и упадут после монтажа оверлеев без моков `virtual:pwa-register/react` и `matchMedia` — покрыто Task 8 Step 1 (моки добавляются ДО монтажа в Step 3). ✓
