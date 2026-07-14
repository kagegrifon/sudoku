# Sudoku PWA — Фаза 7: PWA-полировка + механизм обновления (дизайн)

Дата: 2026-07-14
Статус: одобрено, готово к планированию имплементации.

Эта спека уточняет объём Фазы 7 поверх исходных источников истины
([design §4–5](2026-07-02-sudoku-pwa-design.md), [ADR-0004](../../adr/0004-pwa-update-strategy.md),
[spec §4](../../../sudoku-pwa-spec.md)) с учётом фактического состояния кода после
коммита #7 «интеграция дизайна».

## Граница объёма (важно)

Дизайн из коммита #7 (9 экранов, навигация, тема light/dark) — **заморожен**.
Фаза 7 делает ровно три вещи:

- **(a)** заменяет иконки-плейсхолдеры фазы 1 на финальные из `design/icons/`;
- **(b)** оживляет существующую заглушку — кнопку «Обновить» в `SettingsScreen`;
- **(c)** добавляет то, чего в дизайне нет как экрана — независимые оверлеи
  `UpdateBanner` и `InstallPrompt`.

Не переверстывать экраны, не менять навигацию/тему, не трогать `Header`
(кнопку «Обновить» в Header НЕ добавляем — коммит #7 перенёс эту точку в настройки).

## Фактическое состояние кода (расхождения с исходными предпосылками)

Проверено в коде перед планированием:

1. **`iosInstallPromptDismissed` уже реализован** коммитом #7: поле есть в
   `Settings` (`src/state/gameTypes.ts`), в `DEFAULT_SETTINGS`, в миграции v1→v2
   (`src/state/storage/localSettings.ts`) и покрыто тестом. `SETTINGS_SCHEMA_VERSION`
   уже `2`. **Миграция v2→v3 НЕ нужна** — поле готово к использованию.
2. **`virtual:pwa-register/react` доступен** (`vite-plugin-pwa@^1.3.0`, есть
   `node_modules/vite-plugin-pwa/react.d.ts`). Хук строим поверх `useRegisterSW`.
3. **`theme_color: '#1e293b'`** в манифесте не совпадает со светлой палитрой
   дизайна. Согласовано: `theme_color: '#2f6fed'` (accent), `background_color: '#eef1f7'` (bg).
4. **`icon-rounded-512.png`** — внутренний UI-логотип (используется в
   `design/Sudoku Screens Standalone.dc.html` как 80×80 rounded на стартовом
   экране), а не manifest-иконка. Согласовано: скопировать в `public/icons/` и
   подключить в `HomeScreen` (`ICON_URL`).
5. **`saveGame`** (`src/state/storage/localGame.ts`) пишет вне зависимости от
   статуса партии, включая `paused` — подходит для форс-flush перед reload (design §5 шаг 4).
6. **`SettingsContext.toggle`** типизирован только под булевы тумблеры подсветок
   (`SettingsFlag`). Для одноразового флага `iosInstallPromptDismissed` добавляем
   узкий метод `dismissIosInstallPrompt()` (не расширяя `SettingsFlag`).

## Архитектура компонентов

### `src/state/appUpdate.ts` — `useAppUpdate` (тестируемое ядро)

Хук-обёртка над `useRegisterSW` из `virtual:pwa-register/react`:

```ts
interface AppUpdateApi {
  updateAvailable: boolean;
  applyUpdate: () => void;
}
function useAppUpdate(getGameState: () => GameState): AppUpdateApi;
```

- `updateAvailable` = `needRefresh` из `useRegisterSW`.
- `applyUpdate()` = `saveGame(getGameState())` (форс-flush партии) → `updateServiceWorker(true)`
  (skipWaiting + reload).
- `getGameState` прокидывается владельцем (компонентом, у которого есть `useGame()`),
  чтобы `useAppUpdate` оставался тестируемым без реального SW и не создавал жёсткой
  связки с `GameProvider`.

**Тестируемость:** мокаем `virtual:pwa-register/react`; проверяем, что `applyUpdate`
вызывает `saveGame` затем `updateServiceWorker(true)`, и что `updateAvailable`
отражает `needRefresh`. Юнит-тесты не завязываются на реальный Service Worker.

### `src/components/update/UpdateBanner.tsx` (+ `.module.css`)

Независимый оверлей (не экран дизайна):

- Виден когда `updateAvailable && !dismissed`. `dismissed` — локальный `useState`.
- Кнопка «Обновить» (`data-testid="update-banner-apply"`) → `applyUpdate()`.
- Крестик закрытия (`data-testid="update-banner-dismiss"`) → `setDismissed(true)`.
- Корень `data-testid="update-banner"`.
- Стили из токенов `tokens.css` (light/dark через CSS-переменные).
- При закрытии баннер скрывается, `updateAvailable` остаётся `true` → кнопка
  `update-app` в `SettingsScreen` становится активной.
- Владеет `useAppUpdate` и прокидывает в него `getGameState` из `useGame()`.

### `src/components/install/InstallPrompt.tsx` (+ `.module.css`)

Независимый оверлей:

- **Не показывать**, если `matchMedia('(display-mode: standalone)').matches`.
- **Android:** ловит событие `beforeinstallprompt` (preventDefault, сохраняет
  `deferredPrompt`), кнопка «Установить» → `deferredPrompt.prompt()`.
- **iOS Safari:** детект чистой функцией `isIosSafari(userAgent)` — текстовая
  инструкция «Поделиться → На экран „Домой“». Показ **один раз** через
  `settings.iosInstallPromptDismissed`; закрытие → `dismissIosInstallPrompt()`.
- `data-testid`: `install-prompt`, `install-prompt-accept` (Android),
  `install-prompt-dismiss`.

### `src/state/installDetect.ts` — `isIosSafari` (тестируемое ядро)

Чистая функция от строки user-agent:

```ts
function isIosSafari(userAgent: string): boolean;
```

- `true` для iOS Safari (iPhone/iPad с `Safari`, без `CriOS`/`FxiOS`/`EdgiOS`).
- `false` для iOS Chrome (`CriOS`), не-iOS браузеров, десктопа.
- Также экспортируем `isStandaloneDisplay()` (обёртка над `matchMedia`) для
  переиспользования и мокабельности.

## Точки интеграции

### `vite.config.ts`

- `theme_color: '#2f6fed'`, `background_color: '#eef1f7'`.
- Иконки в `manifest.icons` не меняются (192/512/maskable). `icon-rounded-512.png`
  в манифест не добавляется (внутренний UI-логотип).
- `orientation` не фиксируется (spec §4.1).

### `public/icons/`

Скопировать из `design/icons/`, заменив плейсхолдеры фазы 1:
`icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`,
**+ новый** `icon-rounded-512.png`.

### `src/components/home/HomeScreen.tsx`

`ICON_URL` → `/icons/icon-rounded-512.png` (одна строка; вёрстка/классы не меняются).

### `src/components/settings/SettingsScreen.tsx`

Блок «Данные», кнопка `update-app`:
- убрать `disabled` и TODO-комментарий;
- подключить `useAppUpdate` (прокинуть `getGameState` из `useGame()`);
- кнопка активна **только** при `updateAvailable`, иначе `disabled` (design §5:
  кнопка появляется именно в момент готовности обновления);
- `onClick` = `applyUpdate`. Вёрстку/классы вокруг не менять. `APP_VERSION` не трогать.

Чистая логика видимости (тестируемая): кнопка `disabled === !updateAvailable`.
Тест мокает `useAppUpdate`, проверяет `disabled` при `updateAvailable` = false/true.

### `src/state/SettingsContext.tsx`

Добавить в `SettingsApi` метод `dismissIosInstallPrompt(): void` →
`setSettings((prev) => ({ ...prev, iosInstallPromptDismissed: true }))`.
Не расширять `SettingsFlag` (это не тумблер, а одноразовый флаг).

### `src/App.tsx`

Добавить `<UpdateBanner />` и `<InstallPrompt />` как сиблинги `<ActiveScreen />`
внутри `GameProvider` (UpdateBanner нужен доступ к `useGame()` для flush).
Мапу `SCREENS` и порядок провайдеров не менять.

## Тестирование

**Vitest (юниты, jsdom-прагма по образцу существующих тестов):**

- `isIosSafari(userAgent)` — позитив (iOS Safari) и негатив (iOS Chrome `CriOS`,
  десктоп, Android). Файл `src/state/installDetect.test.ts`.
- Видимость кнопки `update-app` как функция от `updateAvailable` — мок `useAppUpdate`,
  проверка `disabled`. Файл `src/components/settings/SettingsScreen.test.tsx`
  (уже существует — дополнить).
- `useAppUpdate.applyUpdate` — мок `virtual:pwa-register/react`; `applyUpdate`
  вызывает `saveGame` затем `updateServiceWorker(true)`. Файл `src/state/appUpdate.test.ts`.
- Существующий тест `localSettings.test.ts` уже проверяет сохранение
  `iosInstallPromptDismissed` при миграции — оставить как есть (новая миграция не нужна).

**Ручные проверки (не автотесты) — `npm run preview` + DevTools:**

1. Application → Manifest — иконки из design/icons корректны, включая maskable;
   `theme_color`/`background_color` из светлой палитры.
2. Network → Offline — приложение работает на всех экранах (home/game/settings/stats).
3. Появление `UpdateBanner` при готовности новой версии SW; закрытие баннера
   активирует кнопку `update-app` в настройках; кнопка «Обновить» форсирует
   сохранение и reload без потери партии.
4. Мобильный эмулятор: install-prompt на Android (`beforeinstallprompt`),
   текстовая инструкция на iOS Safari (эмуляция UA).
5. Тема (light/dark/system) корректно отображается на новых PWA-элементах
   (баннер, install-prompt).

**Если ручная проверка стопорится** (SW не обновляется предсказуемо в dev,
install-prompt не триггерится, эмулятор недоступен) — остановиться и попросить
пользователя, не обходить нестандартными средствами.

## Файлы

**Создать:** `src/state/appUpdate.ts` (+test), `src/state/installDetect.ts` (+test),
`src/components/update/UpdateBanner.tsx` (+`.module.css`),
`src/components/install/InstallPrompt.tsx` (+`.module.css`).

**Изменить:** `vite.config.ts`, `src/App.tsx`,
`src/components/settings/SettingsScreen.tsx`, `src/components/settings/SettingsScreen.test.tsx`,
`src/components/home/HomeScreen.tsx`, `src/state/SettingsContext.tsx`,
`public/icons/*` (замена файлов).

**Не трогать:** `Header`, `SCREENS`-мапу, порядок провайдеров, тему/навигацию,
`APP_VERSION`, `SETTINGS_SCHEMA_VERSION` (миграция не нужна).

## Риски

- **`getGameState`-проброс** обязателен — иначе `useAppUpdate` завяжется на
  `GameProvider` и потеряет тестируемость.
- **`updateServiceWorker` в dev-режиме** может вести себя непредсказуемо —
  ручную проверку обновления делать на `npm run preview` (production SW), не в dev.
- **iOS-детект по UA** хрупок в принципе — покрываем чистую функцию тестами
  (включая `CriOS`), но признаём, что UA-строки меняются; это осознанный компромисс
  (design §4: детект Safari по UA).
- **`display-mode: standalone`** guard обязателен — иначе install-prompt показывается
  внутри уже установленного PWA.

## Верификация

`npm run type-check && npm run lint && npm test && npm run build`, затем ручные
проверки выше. Финальный проход читаемости по CLAUDE.md (объект-параметры,
lookup-мапы, без вложенных тернарников, описательные имена, testid).
