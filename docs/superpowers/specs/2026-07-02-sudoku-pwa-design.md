# Sudoku PWA — Design (валидированная спецификация)

Дата: 2026-07-02
Статус: одобрено, готово к планированию имплементации.

Этот документ уточняет и фиксирует решения поверх исходной спеки (`sudoku-pwa-spec.md`), закрывая все открытые развилки («на выбор агента», «уточнить при реализации»).

## Зафиксированные решения (developer choices)

| Вопрос | Решение |
|---|---|
| Система стилей | **CSS Modules** (нативно для Vite, без рантайм-зависимостей, ложится на flat JSX из CLAUDE.md) |
| Undo | **Полная история хода** в рамках партии. Redo НЕ делаем. |
| Заметки при вводе цифры | **Автоочистка кандидатов**: постановка цифры убирает её из заметок клеток той же строки/столбца/блока |
| Undo после автоочистки | **Полный откат**, включая восстановление стёртых заметок соседей |
| Streak | **Убран из MVP.** Заменён агрегированной статистикой по периодам |
| Статистика — метрики | Кол-во завершённых партий, лучшее/среднее время, % завершённых, любимая сложность |
| Статистика — периоды | Переключатель **День / Неделя / Месяц / Всё время** + список значений (без графиков) |
| Хранилище истории партий | **IndexedDB через `idb`** |
| Хранилище текущей партии + настроек | **localStorage** |
| Навигация между игрой и статистикой | **`activeView` в Context**, без react-router |
| Обновление приложения | **`registerType: 'prompt'`** + ненавязчивый баннер, контролируемая активация SW |

---

## 1. Архитектура и слои

Три слоя с однонаправленными зависимостями: `components → state → core`. `core/` ни от чего не зависит.

### `core/` — чистая логика судоку (без React, без хранилищ)
- `types.ts` — `Grid = number[][]`, `Difficulty`, вспомогательные типы.
- `solver.ts` — `solve(grid)`; `countSolutions(grid, limit = 2)` для проверки единственности (не останавливаться на первом решении).
- `generator.ts` — `generateFullGrid()` (backtracking + рандомизация порядка чисел); `generatePuzzle(difficulty)` (удаление клеток по одной с проверкой единственности после каждого удаления).
- `validator.ts` — `findConflicts(grid)` (быстрая проверка строки/столбца/блока, БЕЗ полного solver); `isSolved(grid)`.
- `difficulty.ts` — данные: пороги открытых клеток и требуемые техники по уровням (Лёгкий ~36–40, Средний ~30–35, Сложный ~24–28 — откалибровать тестами).

### `state/` — состояние и персистентность
- `gameReducer.ts` — чистый reducer над `GameState`. Actions: `PLACE_DIGIT`, `TOGGLE_NOTE`, `ERASE`, `UNDO`, `TICK`, `NEW_GAME`, `RESTORE`. Диспетчеризация через `Record<ActionType, handler>` (не switch-цепочка).
- `statsService.ts` — запись `CompletedGame` в IndexedDB и агрегация метрик по периодам на лету.
- `storage/localGame.ts` — обёртка над localStorage (текущая партия + настройки), с `schemaVersion` и debounce.
- `storage/historyDb.ts` — обёртка над `idb` (store завершённых партий), с версионированием через `upgrade`-колбэк.
- `GameContext.tsx` / `AppContext.tsx` — провайдеры, `activeView: 'game' | 'stats'`.
- `appUpdate.ts` — обёртка над `virtual:pwa-register`.

### `components/` — UI (тонкие)
`App`, `Header`, `Board`, `NumberPad`, `StatsView`, `DifficultyPicker`, `WinScreen`, `InstallPrompt`, `UpdateBanner`.

Принцип изоляции: `core/` тестируется без React и без DOM; `state/` не знает про DOM; компоненты не содержат игровой логики.

---

## 2. Модель данных

### Текущая партия — localStorage, ключ `sudoku:game`

```ts
type Difficulty = 'easy' | 'medium' | 'hard';
type Grid = number[][];               // 9×9, 0 = пусто

interface GameState {
  schemaVersion: number;
  puzzleId: string;
  difficulty: Difficulty;
  initialGrid: Grid;
  currentGrid: Grid;
  solution: Grid;
  notes: number[][][];                // notes[row][col] = массив кандидатов (Set не сериализуется в JSON)
  history: Move[];                    // полная история для undo
  elapsedSeconds: number;
  startedAt: string;                  // ISO
  status: 'in_progress' | 'completed';
}

interface CellNotesSnapshot {
  row: number;
  col: number;
  prevNotes: number[];
}

interface Move {
  row: number;
  col: number;
  prevValue: number;
  newValue: number;
  wasNote: boolean;
  clearedNotes: CellNotesSnapshot[];  // заметки соседей, стёртые автоочисткой (пусто для note-хода)
}
```

Отличия от исходной спеки (оба вынужденные):
- `notes` — `number[][][]`, а не `Set<number>[][]`: `Set` не переживает `JSON.stringify`.
- `Move.clearedNotes` добавлен для честного undo при автоочистке.

### История партий — IndexedDB, store `games`

```ts
interface CompletedGame {
  id: string;
  difficulty: Difficulty;
  durationSeconds: number;
  completedAt: string;                // ISO — основа для агрегации по периодам
  outcome: 'won' | 'abandoned';
}
```

`CompletedGame` пишется в двух точках:
- при победе → `outcome: 'won'`;
- при старте новой игры, если текущая была `in_progress` → `outcome: 'abandoned'` (нужно для метрики «% завершённых»).

Агрегаты НЕ хранятся — считаются на лету из `CompletedGame[]` за выбранный период (партий немного, БД читается быстро; предрассчитанные суммы — источник рассинхрона).

### Настройки — localStorage, ключ `sudoku:settings`

```ts
interface Settings {
  schemaVersion: number;
  notesMode: boolean;
  lastDifficulty: Difficulty;
  iosInstallPromptDismissed: boolean;
}
```

---

## 3. Потоки данных и механики

### Постановка цифры (режим заметок выключен)
1. Клетка из `initialGrid` — не редактируется.
2. `currentGrid[row][col] = newValue`.
3. **Автоочистка:** убрать эту цифру из `notes` всех клеток той же строки, столбца, блока 3×3; собрать `clearedNotes`.
4. Сформировать `Move` (`prevValue`, `clearedNotes`) → push в `history`.
5. Пересчитать конфликты через `validator.findConflicts` (дёшево, без solver).
6. `isSolved` → `status = 'completed'`, записать `CompletedGame(won)`, показать `WinScreen`.

### Режим заметок (toggle)
Тап цифры добавляет/убирает кандидата в выбранной клетке. `Move.wasNote = true`, `clearedNotes` пуст.

### Undo
Снять последний `Move`: откатить `currentGrid[row][col] = prevValue`, восстановить заметки из `clearedNotes`. Redo нет. На пустом стеке — кнопка disabled.

### Таймер
`elapsedSeconds` в `GameState`, тик раз в секунду через `setInterval` в компоненте (не в reducer). Пауза по `document.visibilitychange`: при уходе — стоп, при возврате — продолжение. Считаем накопленные тики, а не разницу от `startedAt` (иначе фон засчитается).

### Сохранение
Подписка сохраняет `GameState` в localStorage с debounce ~300–500 мс. Тики таймера сохраняем реже (раз в ~5 с и на `visibilitychange`). При старте — `RESTORE`, если есть `in_progress` партия совместимой `schemaVersion`.

---

## 4. UI, адаптивность, PWA

### Компоненты
- `App` — выбор вида по `activeView`, провайдеры, `InstallPrompt`, `UpdateBanner`.
- `Header` — таймер, Undo / Notes-toggle / New Game, переключатель на статистику.
- `Board` — CSS Grid 9×9 + `aspect-ratio: 1`. Классы подсветки (одинаковые цифры, строка/столбец/блок, конфликты) вычисляются над `return`.
- `NumberPad` — 1–9 + Erase; в режиме заметок цифры работают как toggle.
- `StatsView` — переключатель периода + список метрик с разбивкой по сложности.
- `DifficultyPicker` — выбор сложности при New Game.
- `WinScreen` — финальный экран с временем.
- `InstallPrompt` — Android (`beforeinstallprompt`) + iOS-инструкция (детект Safari, флаг в settings, показ один раз).
- `UpdateBanner` — баннер «Доступно обновление».

### Адаптивность
Контейнер flex. Portrait: Board сверху, NumberPad снизу. Landscape/планшет: бок о бок (media query по ориентации/ширине). Тап-зоны ≥44×44px. Тестовые пропорции: iPhone SE, iPhone Pro Max, iPad.

### PWA
- `vite-plugin-pwa` (Workbox), `CacheFirst` для статики, precache всех ассетов.
- Приложение не ходит в сеть за данными (судоку генерируется на клиенте).
- Manifest: `standalone`, ориентация не фиксируется, иконки 192/512 + maskable + apple-touch.
- iOS-метатеги в `index.html` (`apple-mobile-web-app-capable`, `status-bar-style`, `apple-touch-icon`, startup-image).
- iOS ITP: офлайн-кэш может слетать после ~7 дней неактивности — не полагаться на кэш/localStorage как на единственное вечное хранилище.

---

## 5. Механизм обновления приложения

`registerType: 'prompt'` (не `autoUpdate`), чтобы не перезагружать страницу посреди партии.

Поток:
1. `virtual:pwa-register` → `onNeedRefresh` при готовности новой версии (SW в состоянии `waiting`).
2. Показать ненавязчивый баннер `UpdateBanner` «Доступно обновление» + кнопка «Обновить» (не модалка).
3. По кнопке: форсировать flush сохранения партии в localStorage → `updateServiceWorker(true)` (skipWaiting + reload).
4. Если игрок игнорирует — обновление применится при следующем холодном старте. Ничего не ломается.

Совместимость данных между версиями:
- localStorage: `schemaVersion` в объекте. При `RESTORE` при несовпадении версии без миграции — партия отбрасывается (новая игра), статистику в IndexedDB не трогаем.
- IndexedDB: миграции через `idb` `upgrade`-колбэк.

---

## 6. Тестирование

- **Vitest / `core/` (критично):**
  - генератор всегда даёт валидное поле с единственным решением (прогон N раз);
  - solver корректно определяет решаемость на known-answer кейсах;
  - валидатор ловит дубли в строке/столбце/блоке.
- **Vitest / `state/`:** `gameReducer` (undo с автоочисткой — точный откат), `statsService` (агрегация по периодам, «% завершённых», «любимая сложность»).
- **E2E / Playwright:** выбор по `data-testid`, изолированный контекст на тест; ключевые сценарии (партия до победы, восстановление после перезагрузки, офлайн).

---

## 7. Критерии приёмки (Definition of Done)

- [ ] Устанавливается на Android (install-prompt / меню браузера) и iOS (инструкция «Добавить на экран»).
- [ ] Полностью работает офлайн после первого визита.
- [ ] Судоку любой сложности решаемо и единственно (покрыто тестами).
- [ ] Прогресс партии не теряется при закрытии/перезапуске и при обновлении приложения.
- [ ] Корректно отображается на телефоне и планшете, в portrait и landscape.
- [ ] Undo (полный откат, вкл. заметки), заметки с автоочисткой, таймер с паузой, смена сложности работают без багов.
- [ ] Статистика по периодам (День/Неделя/Месяц/Всё): кол-во, лучшее/среднее время, % завершённых, любимая сложность — корректна и сохраняется между запусками.
- [ ] Обновление приложения предлагается баннером и не рвёт партию.

---

## 8. Вне MVP (backlog)

Темы оформления; подсказки (hints); несколько сохранённых партий; push-уведомления; графики в статистике; streak (если появится запрос); обёртка в Capacitor.
