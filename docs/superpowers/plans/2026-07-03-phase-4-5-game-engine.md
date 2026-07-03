# Фазы 4+5: Игровой движок (состояние, сохранение, заметки, undo, таймер, жизни) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить временный локальный стейт Фазы 3 в полноценное состояние партии: `GameState` со всеми механиками (жизни, заметки с автоочисткой, полный undo, таймер с паузой), персистентность в localStorage с восстановлением при старте, выбор сложности и экран победы/поражения.

**Architecture:** Слой `state/` ([ADR-0003](../../adr/0003-state-architecture.md)) с чистым `gameReducer` над `GameState` (диспетчеризация через `Record<ActionType, handler>`), провайдерами Context (`AppContext` — `activeView`; `GameContext` — партия + производные + таймер + сохранение) и обёртками localStorage ([ADR-0002](../../adr/0002-storage-strategy.md)). Компоненты (`Header`, `DifficultyPicker`, `WinScreen`, расширенные `Board`/`Cell`) — тонкие, без игровой логики. Восстановление — синхронно через ленивый инициализатор `useReducer`.

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest + @testing-library/react.

## Global Constraints

- **Стек:** TypeScript + Vite, React 18, CSS Modules, Vitest. Версии не менять.
- **Слои:** `components → state → core`; `core/` не трогаем, только потребляем. `state/` не знает про DOM (кроме провайдеров/хуков). Компоненты без игровой логики ([ADR-0003](../../adr/0003-state-architecture.md)).
- **Хранение:** localStorage — партия `sudoku:game` и настройки `sudoku:settings`, у обоих `schemaVersion`; при несовпадении версии — партия отбрасывается ([ADR-0002](../../adr/0002-storage-strategy.md)). IndexedDB/`CompletedGame` — **НЕ в этой фазе** (Фаза 6); здесь фиксируется только `status`/`result` в `GameState`.
- **Диспетчеризация reducer** — через `Record<GameAction['type'], handler>`, не `switch`.
- **Читаемость (CLAUDE.md):** без вложенных тернарников; описательные имена; options-объект при 3+ параметрах / 2 однотипных / boolean-параметре; flat JSX (классы/значения над `return`); lookup-структуры вместо `if`/`switch`-цепочек.
- **E2E-готовность:** `data-testid` на всех интерактивных элементах.
- **Grid:** 9×9, `0` = пусто (`EMPTY_CELL`). `notes` сериализуется как `number[][][]` (Set не переживает `JSON.stringify`).
- **Жизни:** старт 3 (`INITIAL_LIVES`). Ошибка = `newValue !== solution`. Каждая неверная постановка снимает жизнь. `undo` жизнь **не возвращает**. 0 жизней → `status='completed'`, `result='lost'`.
- **Git:** ветка `feat/phase-4-5-game-engine` (НЕ `main`); коммит на задачу; сообщения `<type>: <описание> (Phase 4-5)`.

### Реальные сигнатуры `core/` (потребляются этой фазой)

```ts
// src/core (barrel src/core/index.ts)
type Difficulty = 'easy' | 'medium' | 'hard';
type Grid = number[][];                 // 9×9, 0 = пусто
const GRID_SIZE = 9; const BOX_SIZE = 3; const EMPTY_CELL = 0;
function generatePuzzle(difficulty: Difficulty): { puzzle: Grid; solution: Grid };
function findConflicts(grid: Grid): boolean[][];
function isSolved(grid: Grid): boolean;
function getBoxStart(index: number): number;
function cloneGrid(grid: Grid): Grid;
```

### Проектные решения этой фазы (зафиксировано)

- **Перенос reducer:** `src/components/game/gameBoardReducer.ts` → `src/state/gameReducer.ts` с новой моделью `GameState` (это уже не UI-стейт, а полноценная партия с персистентностью — по слоям [ADR-0003](../../adr/0003-state-architecture.md)). Старые `gameBoardReducer.ts`, `gameBoardReducer.test.ts`, `useGameBoard.ts` удаляются в Task 16.
- **Восстановление:** ленивый инициализатор `useReducer` вызывает `loadGame()` синхронно (нет лишней генерации головоломки). Экшен `RESTORE` реализован и юнит-тестируется как контракт reducer (design §2), доступен для внедрения загруженного состояния, но на старте используется инициализатор (не двойная генерация).
- **Хранение партии и настроек** разнесено на два focused-файла `storage/localGame.ts` и `storage/localSettings.ts` (по одной ответственности), вместо одного `localGame.ts` из наброска design — читаемость важнее буквального совпадения имён файлов.
- **`selected`-клетка** остаётся локальным UI-стейтом `GameScreen` (не персистится). **`notesMode`/`lastDifficulty`** живут в настройках (localStorage) и в состоянии провайдера.

## File Structure

| Файл | Ответственность |
|---|---|
| `src/state/gameTypes.ts` | Типы `GameState`, `Move`, `CellNotesSnapshot`, `GameAction`, `Settings`; константы (`GAME_SCHEMA_VERSION`, `SETTINGS_SCHEMA_VERSION`, `INITIAL_LIVES`). |
| `src/state/gameReducer.ts` | `createInitialGameState`, хелперы, `gameReducer` (диспетч через `Record`), все handlers. |
| `src/state/gameReducer.test.ts` | Unit-тесты reducer (критично): жизни, автоочистка, undo, победа/поражение. |
| `src/state/storage/localGame.ts` | `saveGame`/`loadGame`/`clearGame` над localStorage; валидация `schemaVersion` + `status`. |
| `src/state/storage/localGame.test.ts` | Round-trip, сериализация `notes`, отбрасывание чужой версии/completed. |
| `src/state/storage/localSettings.ts` | `saveSettings`/`loadSettings` + `DEFAULT_SETTINGS`. |
| `src/state/storage/localSettings.test.ts` | Round-trip, дефолты, отбрасывание версии. |
| `src/state/AppContext.tsx` | Провайдер `activeView: 'game' \| 'stats'`, `useAppView`. |
| `src/state/AppContext.test.tsx` | Дефолт вида, переключение. |
| `src/state/GameContext.tsx` | `GameProvider` (reducer + производные + таймер + сохранение), `useGame`. |
| `src/state/GameContext.test.tsx` | Восстановление, notesMode-роутинг ввода, сохранение. |
| `src/components/header/formatTime.ts` | Чистый `formatTime(seconds): "mm:ss"`. |
| `src/components/header/formatTime.test.ts` | Форматирование времени. |
| `src/components/header/Header.tsx` + `.module.css` | Таймер, жизни (сердца), Undo, toggle заметок, «Новая». |
| `src/components/header/Header.test.tsx` | Отображение таймера/жизней, disabled Undo, toggle. |
| `src/components/difficulty/DifficultyPicker.tsx` + `.module.css` | Выбор сложности при New Game. |
| `src/components/difficulty/DifficultyPicker.test.tsx` | Выбор/отмена. |
| `src/components/winscreen/WinScreen.tsx` + `.module.css` | Финальный экран won/lost. |
| `src/components/winscreen/WinScreen.test.tsx` | Два режима. |
| `src/components/board/cellHighlight.ts` | + флаг `mistake` (Modify). |
| `src/components/board/cellHighlight.test.ts` | + тест mistake, обновить `toEqual` (Modify). |
| `src/components/board/Cell.tsx` | + рендер заметок, класс mistake (Modify). |
| `src/components/board/Board.tsx` | + пропсы `notes`, `mistakes` (Modify). |
| `src/components/board/Board.module.css` | + стили `.notes`/`.note`/`.mistake` (Modify). |
| `src/components/game/GameScreen.tsx` + `.module.css` | Переписать на `useGame` + Header/WinScreen/DifficultyPicker (Modify). |
| `src/components/game/GameScreen.test.tsx` | Переписать под провайдеры (Modify). |
| `src/App.tsx` | Обернуть в `AppProvider` + `GameProvider` (Modify). |
| ~~`src/components/game/gameBoardReducer.ts`~~ | Удалить (Task 16). |
| ~~`src/components/game/gameBoardReducer.test.ts`~~ | Удалить (Task 16). |
| ~~`src/components/game/useGameBoard.ts`~~ | Удалить (Task 16). |

---

### Task 0: Ветка

- [ ] **Step 1: Создать ветку от `main`**

```bash
git checkout main
git checkout -b feat/phase-4-5-game-engine
```

Expected: на ветке `feat/phase-4-5-game-engine`, дерево чистое.

---

### Task 1: Типы состояния и константы

**Files:**
- Create: `src/state/gameTypes.ts`

**Interfaces:**
- Consumes: `type Difficulty`, `type Grid` из `src/core`.
- Produces:
  - Константы `GAME_SCHEMA_VERSION = 1`, `SETTINGS_SCHEMA_VERSION = 1`, `INITIAL_LIVES = 3`.
  - `interface CellNotesSnapshot { row: number; col: number; prevNotes: number[] }`
  - `interface Move { row; col; prevValue; newValue: number; wasNote: boolean; wasMistake: boolean; clearedNotes: CellNotesSnapshot[] }`
  - `type GameStatus = 'in_progress' | 'completed'`; `type GameResult = 'won' | 'lost'`.
  - `interface GameState { schemaVersion; puzzleId; difficulty; initialGrid; currentGrid; solution; notes: number[][][]; history: Move[]; lives; elapsedSeconds; startedAt; status; result? }`
  - `type GameAction` — `PLACE_DIGIT | TOGGLE_NOTE | ERASE | UNDO | TICK | NEW_GAME | RESTORE`.
  - `interface Settings { schemaVersion; notesMode; lastDifficulty; iosInstallPromptDismissed }`

- [ ] **Step 1: Создать `src/state/gameTypes.ts`**

```ts
import type { Difficulty, Grid } from '../core';

export const GAME_SCHEMA_VERSION = 1;
export const SETTINGS_SCHEMA_VERSION = 1;
export const INITIAL_LIVES = 3;

export interface CellNotesSnapshot {
  row: number;
  col: number;
  prevNotes: number[];
}

export interface Move {
  row: number;
  col: number;
  prevValue: number;
  newValue: number;
  wasNote: boolean;
  wasMistake: boolean;
  clearedNotes: CellNotesSnapshot[];
}

export type GameStatus = 'in_progress' | 'completed';
export type GameResult = 'won' | 'lost';

export interface GameState {
  schemaVersion: number;
  puzzleId: string;
  difficulty: Difficulty;
  initialGrid: Grid;
  currentGrid: Grid;
  solution: Grid;
  notes: number[][][]; // notes[row][col] = отсортированные кандидаты
  history: Move[];
  lives: number;
  elapsedSeconds: number;
  startedAt: string; // ISO
  status: GameStatus;
  result?: GameResult;
}

export type GameAction =
  | { type: 'PLACE_DIGIT'; row: number; col: number; value: number }
  | { type: 'TOGGLE_NOTE'; row: number; col: number; value: number }
  | { type: 'ERASE'; row: number; col: number }
  | { type: 'UNDO' }
  | { type: 'TICK' }
  | { type: 'NEW_GAME'; difficulty: Difficulty }
  | { type: 'RESTORE'; state: GameState };

export interface Settings {
  schemaVersion: number;
  notesMode: boolean;
  lastDifficulty: Difficulty;
  iosInstallPromptDismissed: boolean;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/state/gameTypes.ts
git commit -m "feat: Добавить типы GameState и Settings (Phase 4-5)"
```

---

### Task 2: gameReducer — каркас, createInitialGameState, TICK / NEW_GAME / RESTORE

**Files:**
- Create: `src/state/gameReducer.ts`
- Create: `src/state/gameReducer.test.ts`

**Interfaces:**
- Consumes: `generatePuzzle`, `cloneGrid`, `getBoxStart`, `EMPTY_CELL`, `GRID_SIZE`, `BOX_SIZE`, `type Difficulty`, `type Grid` из `src/core`; типы/константы из `./gameTypes`.
- Produces:
  - `createEmptyNotes(): number[][][]`
  - `createInitialGameState(difficulty: Difficulty): GameState`
  - `isGiven(state: GameState, row: number, col: number): boolean`
  - `gameReducer(state: GameState, action: GameAction): GameState` — диспетч через `Record<GameAction['type'], handler>`.
  - Handlers `TICK` (инкремент только `in_progress`), `NEW_GAME` (свежая партия), `RESTORE` (вернуть `action.state`).
- Хелперы `withCellValue`, `cloneNotes`, `samePeers`, `autoclearNotes` — приватные, но нужны последующим таскам (объявляются здесь целиком).

- [ ] **Step 1: Написать падающие тесты**

`src/state/gameReducer.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInitialGameState, gameReducer, isGiven } from './gameReducer';
import { GAME_SCHEMA_VERSION, INITIAL_LIVES, type GameState } from './gameTypes';
import * as core from '../core';
import type { Grid } from '../core';

const solved: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

// Головоломка с несколькими пустыми клетками, часть из которых — соседи по юниту.
// (0,0) и (0,1) — одна строка и один блок 3×3 (нужно для теста автоочистки).
function puzzleWithHoles(): Grid {
  const puzzle = solved.map((row) => [...row]);
  puzzle[0][0] = 0; // solution 5
  puzzle[0][1] = 0; // solution 3
  puzzle[4][4] = 0; // solution 5
  puzzle[8][8] = 0; // solution 9
  return puzzle;
}

function mockPuzzle(puzzle: Grid): void {
  vi.spyOn(core, 'generatePuzzle').mockReturnValue({ puzzle, solution: solved });
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockPuzzle(puzzleWithHoles());
});

describe('createInitialGameState', () => {
  it('заполняет поля стартовой партии', () => {
    const state = createInitialGameState('easy');
    expect(state.schemaVersion).toBe(GAME_SCHEMA_VERSION);
    expect(state.difficulty).toBe('easy');
    expect(state.lives).toBe(INITIAL_LIVES);
    expect(state.elapsedSeconds).toBe(0);
    expect(state.status).toBe('in_progress');
    expect(state.history).toEqual([]);
    expect(typeof state.puzzleId).toBe('string');
    expect(state.puzzleId.length).toBeGreaterThan(0);
  });
  it('currentGrid — независимая копия initialGrid', () => {
    const state = createInitialGameState('easy');
    expect(state.currentGrid).toEqual(state.initialGrid);
    state.currentGrid[0][0] = 9;
    expect(state.initialGrid[0][0]).not.toBe(9);
  });
  it('notes — сетка 9×9 пустых массивов', () => {
    const state = createInitialGameState('easy');
    expect(state.notes).toHaveLength(9);
    expect(state.notes[0]).toHaveLength(9);
    expect(state.notes[0][0]).toEqual([]);
  });
});

describe('isGiven', () => {
  it('true для заданной клетки, false для пустой', () => {
    const state = createInitialGameState('easy');
    expect(isGiven(state, 0, 2)).toBe(true); // given (8)
    expect(isGiven(state, 0, 0)).toBe(false); // hole
  });
});

describe('TICK', () => {
  it('инкрементит elapsedSeconds в in_progress', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'TICK' });
    expect(next.elapsedSeconds).toBe(1);
  });
  it('не тикает в completed', () => {
    const state: GameState = { ...createInitialGameState('easy'), status: 'completed', result: 'won' };
    const next = gameReducer(state, { type: 'TICK' });
    expect(next.elapsedSeconds).toBe(0);
  });
});

describe('NEW_GAME', () => {
  it('создаёт свежую партию заданной сложности', () => {
    const state = { ...createInitialGameState('easy'), elapsedSeconds: 99, lives: 1 };
    const next = gameReducer(state, { type: 'NEW_GAME', difficulty: 'hard' });
    expect(next.difficulty).toBe('hard');
    expect(next.lives).toBe(INITIAL_LIVES);
    expect(next.elapsedSeconds).toBe(0);
    expect(next.status).toBe('in_progress');
  });
});

describe('RESTORE', () => {
  it('возвращает переданное состояние', () => {
    const state = createInitialGameState('easy');
    const saved: GameState = { ...createInitialGameState('medium'), elapsedSeconds: 42 };
    const next = gameReducer(state, { type: 'RESTORE', state: saved });
    expect(next).toBe(saved);
    expect(next.elapsedSeconds).toBe(42);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- gameReducer`
Expected: FAIL — модуль `./gameReducer` не найден.

- [ ] **Step 3: Реализовать `src/state/gameReducer.ts`**

```ts
import {
  generatePuzzle,
  cloneGrid,
  getBoxStart,
  isSolved,
  EMPTY_CELL,
  GRID_SIZE,
  BOX_SIZE,
  type Difficulty,
  type Grid,
} from '../core';
import {
  GAME_SCHEMA_VERSION,
  INITIAL_LIVES,
  type GameState,
  type GameAction,
  type Move,
  type CellNotesSnapshot,
} from './gameTypes';

export function createEmptyNotes(): number[][][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => [] as number[]),
  );
}

function createPuzzleId(): string {
  return crypto.randomUUID();
}

export function createInitialGameState(difficulty: Difficulty): GameState {
  const { puzzle, solution } = generatePuzzle(difficulty);
  return {
    schemaVersion: GAME_SCHEMA_VERSION,
    puzzleId: createPuzzleId(),
    difficulty,
    initialGrid: puzzle,
    currentGrid: cloneGrid(puzzle),
    solution,
    notes: createEmptyNotes(),
    history: [],
    lives: INITIAL_LIVES,
    elapsedSeconds: 0,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
  };
}

export function isGiven(state: GameState, row: number, col: number): boolean {
  return state.initialGrid[row][col] !== EMPTY_CELL;
}

/** Иммутабельно записывает значение в клетку grid, возвращая новый grid. */
function withCellValue(grid: Grid, row: number, col: number, value: number): Grid {
  const next = cloneGrid(grid);
  next[row][col] = value;
  return next;
}

function cloneNotes(notes: number[][][]): number[][][] {
  return notes.map((rowNotes) => rowNotes.map((cellNotes) => [...cellNotes]));
}

/** Все клетки одного юнита (строка + столбец + блок) с клеткой (row,col) включительно; с дублями. */
function samePeers(row: number, col: number): Array<{ row: number; col: number }> {
  const peers: Array<{ row: number; col: number }> = [];
  for (let index = 0; index < GRID_SIZE; index++) {
    peers.push({ row, col: index });
    peers.push({ row: index, col });
  }
  const boxRow = getBoxStart(row);
  const boxCol = getBoxStart(col);
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      peers.push({ row: r, col: c });
    }
  }
  return peers;
}

/**
 * Убирает `value` из заметок всех клеток одного юнита с (row,col).
 * Возвращает новые notes и снимки только тех клеток, что реально изменились.
 */
function autoclearNotes(
  notes: number[][][],
  row: number,
  col: number,
  value: number,
): { notes: number[][][]; cleared: CellNotesSnapshot[] } {
  const nextNotes = cloneNotes(notes);
  const cleared: CellNotesSnapshot[] = [];
  const seen = new Set<string>();
  for (const peer of samePeers(row, col)) {
    const key = `${peer.row},${peer.col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cellNotes = nextNotes[peer.row][peer.col];
    if (!cellNotes.includes(value)) continue;
    cleared.push({ row: peer.row, col: peer.col, prevNotes: [...cellNotes] });
    nextNotes[peer.row][peer.col] = cellNotes.filter((candidate) => candidate !== value);
  }
  return { notes: nextNotes, cleared };
}

type Handler<A extends GameAction> = (state: GameState, action: A) => GameState;

const tick: Handler<Extract<GameAction, { type: 'TICK' }>> = (state) => {
  if (state.status !== 'in_progress') return state;
  return { ...state, elapsedSeconds: state.elapsedSeconds + 1 };
};

const newGame: Handler<Extract<GameAction, { type: 'NEW_GAME' }>> = (_state, action) =>
  createInitialGameState(action.difficulty);

const restore: Handler<Extract<GameAction, { type: 'RESTORE' }>> = (_state, action) => action.state;

const HANDLERS: {
  [K in GameAction['type']]: Handler<Extract<GameAction, { type: K }>>;
} = {
  TICK: tick,
  NEW_GAME: newGame,
  RESTORE: restore,
  // PLACE_DIGIT / TOGGLE_NOTE / ERASE / UNDO добавляются в Tasks 3–6.
} as {
  [K in GameAction['type']]: Handler<Extract<GameAction, { type: K }>>;
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  const handler = HANDLERS[action.type] as Handler<GameAction> | undefined;
  return handler ? handler(state, action) : state;
}

// Экспортируем приватные хелперы для последующих handlers (используются в Tasks 3–6).
export { withCellValue, cloneNotes, autoclearNotes };
```

> **Примечание:** `HANDLERS` пока покрывает три ключа; `PLACE_DIGIT`/`TOGGLE_NOTE`/`ERASE`/`UNDO` дозаполняются в Tasks 3–6. `gameReducer` возвращает `state` при отсутствии handler — это переходное состояние только внутри разработки Tasks 3–6; на выходе Task 6 все ключи заполнены. Приведение `as { ... }` временно снимает ошибку неполноты `Record`; в Task 6 оно удаляется, т.к. запись становится полной.

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- gameReducer`
Expected: PASS (createInitialGameState, isGiven, TICK, NEW_GAME, RESTORE).

- [ ] **Step 5: Commit**

```bash
git add src/state/gameReducer.ts src/state/gameReducer.test.ts
git commit -m "feat: Добавить gameReducer (каркас, TICK/NEW_GAME/RESTORE) (Phase 4-5)"
```

---

### Task 3: PLACE_DIGIT — жизни, автоочистка, победа/поражение

**Files:**
- Modify: `src/state/gameReducer.ts`
- Modify: `src/state/gameReducer.test.ts`

**Interfaces:**
- Produces (в `gameReducer.ts`): handler `PLACE_DIGIT`, добавленный в `HANDLERS`.
- Логика (design §3): given/completed → no-op; иначе записать `value` в `currentGrid`; `wasMistake = value !== solution`; при ошибке `lives-1`; автоочистка заметок соседей (собрать `clearedNotes`); push `Move`; `lives<=0` → `completed/lost`; иначе `isSolved` → `completed/won`.

- [ ] **Step 1: Добавить падающие тесты в `gameReducer.test.ts`**

Дописать в конец файла:
```ts
describe('PLACE_DIGIT', () => {
  it('вписывает верную цифру без потери жизни', () => {
    const state = createInitialGameState('easy'); // (0,0) solution=5
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 5 });
    expect(next.currentGrid[0][0]).toBe(5);
    expect(next.lives).toBe(INITIAL_LIVES);
    expect(next.history).toHaveLength(1);
    expect(next.history[0].wasMistake).toBe(false);
  });
  it('неверная цифра вписывается и снимает жизнь', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 1 });
    expect(next.currentGrid[0][0]).toBe(1);
    expect(next.lives).toBe(INITIAL_LIVES - 1);
    expect(next.history[0].wasMistake).toBe(true);
  });
  it('given-клетка — no-op', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 2, value: 1 });
    expect(next).toBe(state);
  });
  it('автоочистка убирает цифру из заметок соседей и пишет clearedNotes', () => {
    let state = createInitialGameState('easy');
    // Заметка 3 в (0,0) — сосед (0,1) по строке/блоку.
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 3 });
    expect(state.notes[0][0]).toContain(3);
    // Ставим 3 в (0,1) (solution=3) — автоочистка снимает 3 из заметок (0,0).
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 1, value: 3 });
    expect(next.notes[0][0]).not.toContain(3);
    const move = next.history[next.history.length - 1];
    expect(move.clearedNotes).toEqual([{ row: 0, col: 0, prevNotes: [3] }]);
  });
  it('верная последняя цифра завершает партию победой', () => {
    mockPuzzle((() => {
      const puzzle = solved.map((row) => [...row]);
      puzzle[0][0] = 0; // единственная пустая
      return puzzle;
    })());
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 5 });
    expect(next.status).toBe('completed');
    expect(next.result).toBe('won');
  });
  it('третья ошибка обнуляет жизни и завершает партию поражением', () => {
    const state = createInitialGameState('easy'); // lives=3
    const a = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 1 }); // lives2
    const b = gameReducer(a, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 2 }); // lives1
    const c = gameReducer(b, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 4 }); // lives0
    expect(c.lives).toBe(0);
    expect(c.status).toBe('completed');
    expect(c.result).toBe('lost');
  });
  it('после completed новые ходы игнорируются', () => {
    const state: GameState = { ...createInitialGameState('easy'), status: 'completed', result: 'lost' };
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 5 });
    expect(next).toBe(state);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- gameReducer`
Expected: FAIL (PLACE_DIGIT не обрабатывается — `next === state`, победа/жизни не срабатывают).

- [ ] **Step 3: Реализовать handler `PLACE_DIGIT` в `gameReducer.ts`**

Добавить перед объявлением `HANDLERS`:
```ts
const placeDigit: Handler<Extract<GameAction, { type: 'PLACE_DIGIT' }>> = (state, action) => {
  if (state.status === 'completed') return state;
  const { row, col, value } = action;
  if (isGiven(state, row, col)) return state;

  const prevValue = state.currentGrid[row][col];
  const wasMistake = value !== state.solution[row][col];
  const currentGrid = withCellValue(state.currentGrid, row, col, value);
  const { notes, cleared } = autoclearNotes(state.notes, row, col, value);

  const move: Move = {
    row,
    col,
    prevValue,
    newValue: value,
    wasNote: false,
    wasMistake,
    clearedNotes: cleared,
  };
  const lives = wasMistake ? state.lives - 1 : state.lives;
  const base: GameState = {
    ...state,
    currentGrid,
    notes,
    history: [...state.history, move],
    lives,
  };

  if (lives <= 0) return { ...base, status: 'completed', result: 'lost' };
  if (isSolved(currentGrid)) return { ...base, status: 'completed', result: 'won' };
  return base;
};
```

Добавить в `HANDLERS` строку `PLACE_DIGIT: placeDigit,`.

> `isSolved` уже импортирован в Task 2. `TOGGLE_NOTE` в тесте автоочистки реализуется в Task 4 — этот подтест до Task 4 упадёт; порядок: реализуй Task 3-handler, затем сразу Task 4 (тест автоочистки станет зелёным после Task 4). Чтобы шаг был самодостаточным — временно замени в подтесте «автоочистка» установку заметки через прямую сборку state (см. ниже), либо выполняй Task 3 и Task 4 подряд и запускай тесты после Task 4. Рекомендовано: **выполнять Task 3 → Task 4 подряд, финальный прогон после Task 4.**

- [ ] **Step 4: Запустить (кроме подтеста автоочистки — он зелёный после Task 4)**

Run: `npm test -- gameReducer`
Expected: PASS для всех PLACE_DIGIT-подтестов, КРОМЕ «автоочистка …», который станет зелёным после Task 4 (TOGGLE_NOTE). Если исполняешь строго по одной задаче — переходи к Task 4 до коммита.

- [ ] **Step 5: Commit (после Task 4, единым блоком «ввод цифры + заметки»)**

Файлы будут закоммичены в Task 4.

---

### Task 4: TOGGLE_NOTE

**Files:**
- Modify: `src/state/gameReducer.ts`
- Modify: `src/state/gameReducer.test.ts`

**Interfaces:**
- Produces: handler `TOGGLE_NOTE` в `HANDLERS`.
- Логика (design §3): given/completed → no-op; клетка с непустым `currentGrid` → no-op (нельзя ставить заметку в заполненную клетку); toggle `value` в `notes[row][col]` (сортировка по возрастанию); `Move.wasNote=true`, `clearedNotes=[{row,col,prevNotes}]` (для точного undo самой заметки).

- [ ] **Step 1: Добавить падающие тесты в `gameReducer.test.ts`**

```ts
describe('TOGGLE_NOTE', () => {
  it('добавляет и убирает кандидата', () => {
    const state = createInitialGameState('easy');
    const added = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    expect(added.notes[0][0]).toEqual([4]);
    const removed = gameReducer(added, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    expect(removed.notes[0][0]).toEqual([]);
  });
  it('держит кандидатов отсортированными', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 7 });
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 2 });
    expect(state.notes[0][0]).toEqual([2, 7]);
  });
  it('заметка пишет ход с wasNote и снимком prevNotes', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    const move = next.history[next.history.length - 1];
    expect(move.wasNote).toBe(true);
    expect(move.clearedNotes).toEqual([{ row: 0, col: 0, prevNotes: [] }]);
  });
  it('given-клетка — no-op', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 2, value: 4 });
    expect(next).toBe(state);
  });
  it('нельзя ставить заметку в заполненную клетку', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 5 });
    const next = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    expect(next).toBe(state);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- gameReducer`
Expected: FAIL (TOGGLE_NOTE не обрабатывается).

- [ ] **Step 3: Реализовать handler `TOGGLE_NOTE`**

Добавить перед `HANDLERS`:
```ts
const toggleNote: Handler<Extract<GameAction, { type: 'TOGGLE_NOTE' }>> = (state, action) => {
  if (state.status === 'completed') return state;
  const { row, col, value } = action;
  if (isGiven(state, row, col)) return state;
  if (state.currentGrid[row][col] !== EMPTY_CELL) return state;

  const prevNotes = state.notes[row][col];
  const nextNotes = cloneNotes(state.notes);
  const alreadyNoted = prevNotes.includes(value);
  nextNotes[row][col] = alreadyNoted
    ? prevNotes.filter((candidate) => candidate !== value)
    : [...prevNotes, value].sort((a, b) => a - b);

  const move: Move = {
    row,
    col,
    prevValue: EMPTY_CELL,
    newValue: EMPTY_CELL,
    wasNote: true,
    wasMistake: false,
    clearedNotes: [{ row, col, prevNotes: [...prevNotes] }],
  };
  return { ...state, notes: nextNotes, history: [...state.history, move] };
};
```

Добавить в `HANDLERS`: `TOGGLE_NOTE: toggleNote,`.

- [ ] **Step 4: Запустить — убедиться, что всё зелёное (вкл. автоочистку из Task 3)**

Run: `npm test -- gameReducer`
Expected: PASS (все PLACE_DIGIT + TOGGLE_NOTE).

- [ ] **Step 5: Commit (Task 3 + Task 4)**

```bash
git add src/state/gameReducer.ts src/state/gameReducer.test.ts
git commit -m "feat: PLACE_DIGIT (жизни/автоочистка/победа) и TOGGLE_NOTE (Phase 4-5)"
```

---

### Task 5: ERASE

**Files:**
- Modify: `src/state/gameReducer.ts`
- Modify: `src/state/gameReducer.test.ts`

**Interfaces:**
- Produces: handler `ERASE` в `HANDLERS`.
- Логика: given/completed → no-op; пустая клетка без заметок → no-op; иначе очистить значение и заметки клетки, записать `Move` (`prevValue`, `newValue=0`, `wasMistake=false`, `clearedNotes` со снимком собственных заметок, если были) — чтобы undo восстановил и значение, и заметки.

- [ ] **Step 1: Добавить падающие тесты**

```ts
describe('ERASE', () => {
  it('очищает значение и пишет ход', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 1 });
    const erased = gameReducer(state, { type: 'ERASE', row: 0, col: 0 });
    expect(erased.currentGrid[0][0]).toBe(0);
    expect(erased.history[erased.history.length - 1].prevValue).toBe(1);
  });
  it('очищает заметки и сохраняет снимок для undo', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    const erased = gameReducer(state, { type: 'ERASE', row: 0, col: 0 });
    expect(erased.notes[0][0]).toEqual([]);
    expect(erased.history[erased.history.length - 1].clearedNotes).toEqual([
      { row: 0, col: 0, prevNotes: [4] },
    ]);
  });
  it('given-клетка — no-op', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'ERASE', row: 0, col: 2 });
    expect(next).toBe(state);
  });
  it('пустая клетка без заметок — no-op', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'ERASE', row: 0, col: 0 });
    expect(next).toBe(state);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- gameReducer`
Expected: FAIL (ERASE не обрабатывается).

- [ ] **Step 3: Реализовать handler `ERASE`**

```ts
const erase: Handler<Extract<GameAction, { type: 'ERASE' }>> = (state, action) => {
  if (state.status === 'completed') return state;
  const { row, col } = action;
  if (isGiven(state, row, col)) return state;

  const prevValue = state.currentGrid[row][col];
  const prevNotes = state.notes[row][col];
  if (prevValue === EMPTY_CELL && prevNotes.length === 0) return state;

  const currentGrid = withCellValue(state.currentGrid, row, col, EMPTY_CELL);
  const nextNotes = cloneNotes(state.notes);
  nextNotes[row][col] = [];

  const clearedNotes: Move['clearedNotes'] =
    prevNotes.length > 0 ? [{ row, col, prevNotes: [...prevNotes] }] : [];
  const move: Move = {
    row,
    col,
    prevValue,
    newValue: EMPTY_CELL,
    wasNote: false,
    wasMistake: false,
    clearedNotes,
  };
  return { ...state, currentGrid, notes: nextNotes, history: [...state.history, move] };
};
```

Добавить в `HANDLERS`: `ERASE: erase,`.

- [ ] **Step 4: Запустить — PASS**

Run: `npm test -- gameReducer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/gameReducer.ts src/state/gameReducer.test.ts
git commit -m "feat: ERASE (очистка значения и заметок, undoable) (Phase 4-5)"
```

---

### Task 6: UNDO

**Files:**
- Modify: `src/state/gameReducer.ts`
- Modify: `src/state/gameReducer.test.ts`

**Interfaces:**
- Produces: handler `UNDO` в `HANDLERS`; после этой задачи `HANDLERS` полон — удалить временное приведение `as { ... }` из Task 2.
- Логика (design §3): completed → no-op; пустая история → no-op; снять последний `Move`; `currentGrid[row][col]=prevValue`; восстановить каждый снимок из `clearedNotes`; **жизни не менять**; убрать ход из истории.

- [ ] **Step 1: Добавить падающие тесты**

```ts
describe('UNDO', () => {
  it('откатывает значение и снимает ход из истории', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 5 });
    const undone = gameReducer(state, { type: 'UNDO' });
    expect(undone.currentGrid[0][0]).toBe(0);
    expect(undone.history).toHaveLength(0);
  });
  it('точно восстанавливает заметки соседей после автоочистки', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 3 });
    state = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 1, value: 3 }); // автоочистка (0,0)
    expect(state.notes[0][0]).not.toContain(3);
    const undone = gameReducer(state, { type: 'UNDO' });
    expect(undone.notes[0][0]).toEqual([3]); // заметка соседа восстановлена
    expect(undone.currentGrid[0][1]).toBe(0);
  });
  it('undo НЕ возвращает потерянную жизнь', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 1 }); // ошибка, lives2
    expect(state.lives).toBe(INITIAL_LIVES - 1);
    const undone = gameReducer(state, { type: 'UNDO' });
    expect(undone.lives).toBe(INITIAL_LIVES - 1); // жизнь не вернулась
    expect(undone.currentGrid[0][0]).toBe(0);
  });
  it('undo заметки возвращает прежние кандидаты', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    const undone = gameReducer(state, { type: 'UNDO' });
    expect(undone.notes[0][0]).toEqual([]);
  });
  it('пустая история — no-op', () => {
    const state = createInitialGameState('easy');
    expect(gameReducer(state, { type: 'UNDO' })).toBe(state);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- gameReducer`
Expected: FAIL (UNDO не обрабатывается).

- [ ] **Step 3: Реализовать handler `UNDO` и завершить `HANDLERS`**

```ts
const undo: Handler<Extract<GameAction, { type: 'UNDO' }>> = (state) => {
  if (state.status === 'completed') return state;
  if (state.history.length === 0) return state;

  const move = state.history[state.history.length - 1];
  const currentGrid = withCellValue(state.currentGrid, move.row, move.col, move.prevValue);
  const nextNotes = cloneNotes(state.notes);
  for (const snapshot of move.clearedNotes) {
    nextNotes[snapshot.row][snapshot.col] = [...snapshot.prevNotes];
  }
  // Жизни намеренно не восстанавливаем: потерянная жизнь остаётся потерянной.
  return { ...state, currentGrid, notes: nextNotes, history: state.history.slice(0, -1) };
};
```

Обновить `HANDLERS` до полной записи (убрать приведение `as { ... }`):
```ts
const HANDLERS: {
  [K in GameAction['type']]: Handler<Extract<GameAction, { type: K }>>;
} = {
  PLACE_DIGIT: placeDigit,
  TOGGLE_NOTE: toggleNote,
  ERASE: erase,
  UNDO: undo,
  TICK: tick,
  NEW_GAME: newGame,
  RESTORE: restore,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  const handler = HANDLERS[action.type] as Handler<GameAction>;
  return handler(state, action);
}
```

- [ ] **Step 4: Запустить весь reducer-набор — PASS**

Run: `npm test -- gameReducer`
Expected: PASS (все actions).

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: без ошибок (`HANDLERS` полон, приведения `undefined`-ветки убраны).

- [ ] **Step 6: Commit**

```bash
git add src/state/gameReducer.ts src/state/gameReducer.test.ts
git commit -m "feat: UNDO (полный откат, жизнь не возвращается) (Phase 4-5)"
```

---

### Task 7: Хранение партии — localGame

**Files:**
- Create: `src/state/storage/localGame.ts`
- Create: `src/state/storage/localGame.test.ts`

**Interfaces:**
- Consumes: `GAME_SCHEMA_VERSION`, `type GameState` из `../gameTypes`.
- Produces:
  - `const GAME_STORAGE_KEY = 'sudoku:game'`
  - `saveGame(state: GameState): void` — сериализует и пишет; ошибки хранилища глотает.
  - `loadGame(): GameState | null` — читает; `null` если нет/битый JSON/чужой `schemaVersion`/`status !== 'in_progress'`.
  - `clearGame(): void`

- [ ] **Step 1: Написать падающие тесты**

`src/state/storage/localGame.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, clearGame, GAME_STORAGE_KEY } from './localGame';
import { GAME_SCHEMA_VERSION, INITIAL_LIVES, type GameState } from '../gameTypes';

function sampleState(overrides: Partial<GameState> = {}): GameState {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  const notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]));
  notes[0][0] = [1, 5, 9]; // проверяем сериализацию number[][][]
  return {
    schemaVersion: GAME_SCHEMA_VERSION,
    puzzleId: 'p1',
    difficulty: 'easy',
    initialGrid: grid,
    currentGrid: grid.map((r) => [...r]),
    solution: grid.map((r) => [...r]),
    notes,
    history: [],
    lives: INITIAL_LIVES,
    elapsedSeconds: 7,
    startedAt: '2026-07-03T00:00:00.000Z',
    status: 'in_progress',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('localGame', () => {
  it('round-trip сохраняет и загружает партию, включая notes как number[][][]', () => {
    const state = sampleState();
    saveGame(state);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.notes[0][0]).toEqual([1, 5, 9]);
    expect(loaded?.elapsedSeconds).toBe(7);
  });
  it('null, если ничего не сохранено', () => {
    expect(loadGame()).toBeNull();
  });
  it('null при чужом schemaVersion (партия отбрасывается)', () => {
    saveGame(sampleState({ schemaVersion: 999 }));
    expect(loadGame()).toBeNull();
  });
  it('null для завершённой партии (восстанавливаем только in_progress)', () => {
    saveGame(sampleState({ status: 'completed', result: 'won' }));
    expect(loadGame()).toBeNull();
  });
  it('null при битом JSON', () => {
    localStorage.setItem(GAME_STORAGE_KEY, '{не json');
    expect(loadGame()).toBeNull();
  });
  it('clearGame удаляет запись', () => {
    saveGame(sampleState());
    clearGame();
    expect(loadGame()).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- localGame`
Expected: FAIL — модуль `./localGame` не найден.

- [ ] **Step 3: Реализовать `src/state/storage/localGame.ts`**

```ts
import { GAME_SCHEMA_VERSION, type GameState } from '../gameTypes';

export const GAME_STORAGE_KEY = 'sudoku:game';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Хранилище недоступно/переполнено — партия просто не сохранится.
  }
}

function isRestorableGame(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<GameState>;
  if (candidate.schemaVersion !== GAME_SCHEMA_VERSION) return false;
  if (candidate.status !== 'in_progress') return false;
  return true;
}

export function loadGame(): GameState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(GAME_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isRestorableGame(parsed) ? parsed : null;
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_STORAGE_KEY);
  } catch {
    // no-op
  }
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `npm test -- localGame`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/storage/localGame.ts src/state/storage/localGame.test.ts
git commit -m "feat: Обёртка localStorage для партии с валидацией schemaVersion (Phase 4-5)"
```

---

### Task 8: Хранение настроек — localSettings

**Files:**
- Create: `src/state/storage/localSettings.ts`
- Create: `src/state/storage/localSettings.test.ts`

**Interfaces:**
- Consumes: `SETTINGS_SCHEMA_VERSION`, `type Settings` из `../gameTypes`.
- Produces:
  - `const SETTINGS_STORAGE_KEY = 'sudoku:settings'`
  - `const DEFAULT_SETTINGS: Settings`
  - `saveSettings(settings: Settings): void`
  - `loadSettings(): Settings` — всегда возвращает валидный объект (дефолты при отсутствии/битости/чужой версии).

- [ ] **Step 1: Написать падающие тесты**

`src/state/storage/localSettings.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { saveSettings, loadSettings, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './localSettings';
import { SETTINGS_SCHEMA_VERSION } from '../gameTypes';

beforeEach(() => {
  localStorage.clear();
});

describe('localSettings', () => {
  it('дефолты, если ничего не сохранено', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('round-trip', () => {
    saveSettings({
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      notesMode: true,
      lastDifficulty: 'hard',
      iosInstallPromptDismissed: true,
    });
    const loaded = loadSettings();
    expect(loaded.notesMode).toBe(true);
    expect(loaded.lastDifficulty).toBe('hard');
    expect(loaded.iosInstallPromptDismissed).toBe(true);
  });
  it('дефолты при чужом schemaVersion', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 999, notesMode: true, lastDifficulty: 'hard' }),
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('дефолты при битом JSON', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, 'oops');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- localSettings`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/state/storage/localSettings.ts`**

```ts
import { SETTINGS_SCHEMA_VERSION, type Settings } from '../gameTypes';

export const SETTINGS_STORAGE_KEY = 'sudoku:settings';

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  notesMode: false,
  lastDifficulty: 'easy',
  iosInstallPromptDismissed: false,
};

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // no-op
  }
}

export function loadSettings(): Settings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (!raw) return { ...DEFAULT_SETTINGS };

  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    if (parsed.schemaVersion !== SETTINGS_SCHEMA_VERSION) return { ...DEFAULT_SETTINGS };
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      notesMode: parsed.notesMode ?? DEFAULT_SETTINGS.notesMode,
      lastDifficulty: parsed.lastDifficulty ?? DEFAULT_SETTINGS.lastDifficulty,
      iosInstallPromptDismissed:
        parsed.iosInstallPromptDismissed ?? DEFAULT_SETTINGS.iosInstallPromptDismissed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `npm test -- localSettings`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/storage/localSettings.ts src/state/storage/localSettings.test.ts
git commit -m "feat: Обёртка localStorage для настроек (Phase 4-5)"
```

---

### Task 9: AppContext (activeView)

**Files:**
- Create: `src/state/AppContext.tsx`
- Create: `src/state/AppContext.test.tsx`

**Interfaces:**
- Produces:
  - `type ActiveView = 'game' | 'stats'`
  - `AppProvider({ children }): JSX.Element`
  - `useAppView(): { activeView: ActiveView; setActiveView(view: ActiveView): void }`
- Экран статистики появится в Фазе 6; здесь закладываем поле и переключатель ([ADR-0003](../../adr/0003-state-architecture.md)).

- [ ] **Step 1: Написать падающий тест**

`src/state/AppContext.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider, useAppView } from './AppContext';

function Probe() {
  const { activeView, setActiveView } = useAppView();
  return (
    <div>
      <span data-testid="view">{activeView}</span>
      <button type="button" data-testid="go-stats" onClick={() => setActiveView('stats')}>
        stats
      </button>
    </div>
  );
}

afterEach(cleanup);

describe('AppContext', () => {
  it('стартовый вид — game', () => {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    expect(screen.getByTestId('view').textContent).toBe('game');
  });
  it('setActiveView переключает вид', () => {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    fireEvent.click(screen.getByTestId('go-stats'));
    expect(screen.getByTestId('view').textContent).toBe('stats');
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npm test -- AppContext`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/state/AppContext.tsx`**

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type ActiveView = 'game' | 'stats';

interface AppContextValue {
  activeView: ActiveView;
  setActiveView(view: ActiveView): void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ActiveView>('game');
  const value = useMemo(() => ({ activeView, setActiveView }), [activeView]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppView(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppView должен использоваться внутри AppProvider');
  return context;
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `npm test -- AppContext`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/AppContext.tsx src/state/AppContext.test.tsx
git commit -m "feat: AppContext с activeView (Phase 4-5)"
```

---

### Task 10: GameContext — провайдер, useGame, таймер, сохранение

**Files:**
- Create: `src/state/GameContext.tsx`
- Create: `src/state/GameContext.test.tsx`

**Interfaces:**
- Consumes: `findConflicts`, `EMPTY_CELL`, `type Difficulty` из `../core`; `gameReducer`, `createInitialGameState` из `./gameReducer`; `type GameState`, `type GameAction` из `./gameTypes`; `loadGame`, `saveGame` из `./storage/localGame`; `loadSettings`, `saveSettings` из `./storage/localSettings`.
- Produces:
  - `interface GameApi { state: GameState; conflicts: boolean[][]; mistakes: boolean[][]; won: boolean; lost: boolean; canUndo: boolean; notesMode: boolean; cellIsGiven(row, col): boolean; inputDigit(t: { row; col; value }): void; erase(t: { row; col }): void; undo(): void; newGame(difficulty: Difficulty): void; toggleNotesMode(): void }`
  - `GameProvider({ children }): JSX.Element`
  - `useGame(): GameApi`
- Восстановление — ленивый инициализатор `initGameState()` (loadGame ?? свежая по `lastDifficulty`). Таймер — `TICK` раз в секунду, пауза при `document.hidden`. Сохранение — debounce 400 мс на структурные изменения + периодический flush 5 с и на `visibilitychange`.

- [ ] **Step 1: Написать падающие тесты**

`src/state/GameContext.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';
import { GAME_STORAGE_KEY } from './storage/localGame';
import { GAME_SCHEMA_VERSION } from './gameTypes';
import * as core from '../core';
import type { Grid } from '../core';

const solved: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];
function puzzleOneHole(): Grid {
  const puzzle = solved.map((r) => [...r]);
  puzzle[0][0] = 0;
  return puzzle;
}

function Probe() {
  const game = useGame();
  return (
    <div>
      <span data-testid="cell00">{game.state.currentGrid[0][0]}</span>
      <span data-testid="notes00">{game.state.notes[0][0].join(',')}</span>
      <span data-testid="notesMode">{String(game.notesMode)}</span>
      <button data-testid="place" type="button" onClick={() => game.inputDigit({ row: 0, col: 0, value: 7 })}>
        place
      </button>
      <button data-testid="toggle" type="button" onClick={game.toggleNotesMode}>
        toggle
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.spyOn(core, 'generatePuzzle').mockReturnValue({ puzzle: puzzleOneHole(), solution: solved });
});
afterEach(cleanup);

describe('GameContext', () => {
  it('inputDigit в обычном режиме ставит цифру', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    fireEvent.click(screen.getByTestId('place'));
    expect(screen.getByTestId('cell00').textContent).toBe('7');
  });
  it('inputDigit в режиме заметок ставит кандидата', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    fireEvent.click(screen.getByTestId('toggle'));
    fireEvent.click(screen.getByTestId('place'));
    expect(screen.getByTestId('notes00').textContent).toBe('7');
    expect(screen.getByTestId('cell00').textContent).toBe('0');
  });
  it('восстанавливает in_progress партию из localStorage', () => {
    const saved = {
      schemaVersion: GAME_SCHEMA_VERSION,
      puzzleId: 'restored',
      difficulty: 'easy',
      initialGrid: puzzleOneHole(),
      currentGrid: (() => {
        const g = puzzleOneHole();
        g[0][0] = 4;
        return g;
      })(),
      solution: solved,
      notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[])),
      history: [],
      lives: 2,
      elapsedSeconds: 33,
      startedAt: '2026-07-03T00:00:00.000Z',
      status: 'in_progress',
    };
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(saved));
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    // Восстановлено значение 4, а не сгенерированная пустая клетка.
    expect(screen.getByTestId('cell00').textContent).toBe('4');
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npm test -- GameContext`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/state/GameContext.tsx`**

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import { findConflicts, EMPTY_CELL, type Difficulty } from '../core';
import { gameReducer, createInitialGameState } from './gameReducer';
import type { GameState, GameAction, GameStatus } from './gameTypes';
import { loadGame, saveGame } from './storage/localGame';
import { loadSettings, saveSettings } from './storage/localSettings';

const SAVE_DEBOUNCE_MS = 400;
const TIMER_SAVE_INTERVAL_MS = 5000;

interface DigitTarget {
  row: number;
  col: number;
  value: number;
}
interface CellTarget {
  row: number;
  col: number;
}

export interface GameApi {
  state: GameState;
  conflicts: boolean[][];
  mistakes: boolean[][];
  won: boolean;
  lost: boolean;
  canUndo: boolean;
  notesMode: boolean;
  cellIsGiven(row: number, col: number): boolean;
  inputDigit(target: DigitTarget): void;
  erase(target: CellTarget): void;
  undo(): void;
  newGame(difficulty: Difficulty): void;
  toggleNotesMode(): void;
}

const GameContext = createContext<GameApi | null>(null);

function initGameState(): GameState {
  const restored = loadGame();
  if (restored) return restored;
  return createInitialGameState(loadSettings().lastDifficulty);
}

/** Клетка ошибочна: игрок вписал непустое значение, не совпадающее с решением. */
function computeMistakes(state: GameState): boolean[][] {
  return state.currentGrid.map((rowValues, row) =>
    rowValues.map((value, col) => {
      if (value === EMPTY_CELL) return false;
      if (state.initialGrid[row][col] !== EMPTY_CELL) return false;
      return value !== state.solution[row][col];
    }),
  );
}

function useGamePersistence(state: GameState): void {
  const stateRef = useRef(state);
  stateRef.current = state;

  // Структурные изменения (не тики таймера) — сохраняем с debounce.
  useEffect(() => {
    const handle = window.setTimeout(() => saveGame(stateRef.current), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [state.currentGrid, state.notes, state.history, state.lives, state.status, state.result]);

  // Таймер и уход со страницы — периодический flush.
  useEffect(() => {
    const flush = () => saveGame(stateRef.current);
    const interval = window.setInterval(flush, TIMER_SAVE_INTERVAL_MS);
    const onVisibility = () => {
      if (document.hidden) flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}

function useGameTimer({
  status,
  dispatch,
}: {
  status: GameStatus;
  dispatch: Dispatch<GameAction>;
}): void {
  useEffect(() => {
    if (status !== 'in_progress') return;
    const id = window.setInterval(() => {
      if (!document.hidden) dispatch({ type: 'TICK' });
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, dispatch]);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initGameState);
  const [settings, setSettings] = useState(loadSettings);

  const conflicts = useMemo(() => findConflicts(state.currentGrid), [state.currentGrid]);
  const mistakes = useMemo(
    () => computeMistakes(state),
    [state.currentGrid, state.solution, state.initialGrid],
  );

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useGamePersistence(state);
  useGameTimer({ status: state.status, dispatch });

  const notesMode = settings.notesMode;

  const inputDigit = ({ row, col, value }: DigitTarget) => {
    if (notesMode) dispatch({ type: 'TOGGLE_NOTE', row, col, value });
    else dispatch({ type: 'PLACE_DIGIT', row, col, value });
  };

  const newGame = (difficulty: Difficulty) => {
    setSettings((prev) => ({ ...prev, lastDifficulty: difficulty }));
    dispatch({ type: 'NEW_GAME', difficulty });
  };

  const toggleNotesMode = () => setSettings((prev) => ({ ...prev, notesMode: !prev.notesMode }));

  const api: GameApi = {
    state,
    conflicts,
    mistakes,
    won: state.status === 'completed' && state.result === 'won',
    lost: state.status === 'completed' && state.result === 'lost',
    canUndo: state.history.length > 0 && state.status === 'in_progress',
    notesMode,
    cellIsGiven: (row, col) => state.initialGrid[row][col] !== EMPTY_CELL,
    inputDigit,
    erase: ({ row, col }) => dispatch({ type: 'ERASE', row, col }),
    undo: () => dispatch({ type: 'UNDO' }),
    newGame,
    toggleNotesMode,
  };

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame должен использоваться внутри GameProvider');
  return context;
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `npm test -- GameContext`
Expected: PASS (ввод, режим заметок, восстановление).

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git add src/state/GameContext.tsx src/state/GameContext.test.tsx
git commit -m "feat: GameProvider с таймером, сохранением и восстановлением (Phase 4-5)"
```

---

### Task 11: formatTime

**Files:**
- Create: `src/components/header/formatTime.ts`
- Create: `src/components/header/formatTime.test.ts`

**Interfaces:**
- Produces: `formatTime(totalSeconds: number): string` — `"mm:ss"`, минуты без верхней границы, обе части ≥2 знаков.

- [ ] **Step 1: Написать падающий тест**

`src/components/header/formatTime.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatTime } from './formatTime';

describe('formatTime', () => {
  it('0 → 00:00', () => expect(formatTime(0)).toBe('00:00'));
  it('9 → 00:09', () => expect(formatTime(9)).toBe('00:09'));
  it('75 → 01:15', () => expect(formatTime(75)).toBe('01:15'));
  it('3661 → 61:01 (минуты не ограничены 60)', () => expect(formatTime(3661)).toBe('61:01'));
  it('отрицательное → 00:00', () => expect(formatTime(-5)).toBe('00:00'));
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npm test -- formatTime`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/components/header/formatTime.ts`**

```ts
export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `npm test -- formatTime`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/header/formatTime.ts src/components/header/formatTime.test.ts
git commit -m "feat: Хелпер formatTime (mm:ss) (Phase 4-5)"
```

---

### Task 12: Header (таймер, жизни, Undo, toggle заметок, Новая)

**Files:**
- Create: `src/components/header/Header.tsx`
- Create: `src/components/header/Header.module.css`
- Create: `src/components/header/Header.test.tsx`

**Interfaces:**
- Consumes: `useGame` из `../../state/GameContext`; `formatTime` из `./formatTime`; `INITIAL_LIVES` из `../../state/gameTypes`.
- Produces:
  - `interface HeaderProps { onNewGame(): void }` — колбэк открывает `DifficultyPicker` (Header сам новую игру не стартует).
  - `default` экспорт `Header`.
- `data-testid`: `header`, `timer`, `lives`, `undo`, `notes-toggle`, `new-game`. Undo `disabled={!game.canUndo}`. Notes-toggle `aria-pressed={game.notesMode}`.

- [ ] **Step 1: Написать падающий тест**

`src/components/header/Header.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Header from './Header';
import { GameProvider } from '../../state/GameContext';
import * as core from '../../core';
import type { Grid } from '../../core';

const solved: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];
function puzzleOneHole(): Grid {
  const puzzle = solved.map((r) => [...r]);
  puzzle[0][0] = 0;
  return puzzle;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.spyOn(core, 'generatePuzzle').mockReturnValue({ puzzle: puzzleOneHole(), solution: solved });
});
afterEach(cleanup);

function renderHeader(onNewGame = () => {}) {
  return render(
    <GameProvider>
      <Header onNewGame={onNewGame} />
    </GameProvider>,
  );
}

describe('Header', () => {
  it('показывает стартовый таймер 00:00', () => {
    renderHeader();
    expect(screen.getByTestId('timer').textContent).toBe('00:00');
  });
  it('показывает индикатор жизней', () => {
    renderHeader();
    expect(screen.getByTestId('lives')).toBeTruthy();
  });
  it('Undo задизейблен на пустой истории', () => {
    renderHeader();
    expect(screen.getByTestId('undo').hasAttribute('disabled')).toBe(true);
  });
  it('клик по «Новая» вызывает onNewGame', () => {
    const onNewGame = vi.fn();
    renderHeader(onNewGame);
    fireEvent.click(screen.getByTestId('new-game'));
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });
  it('toggle заметок переключает aria-pressed', () => {
    renderHeader();
    const toggle = screen.getByTestId('notes-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npm test -- Header`
Expected: FAIL — модуль `./Header` не найден.

- [ ] **Step 3: Реализовать `src/components/header/Header.tsx`**

```tsx
import { useGame } from '../../state/GameContext';
import { INITIAL_LIVES } from '../../state/gameTypes';
import { formatTime } from './formatTime';
import styles from './Header.module.css';

interface HeaderProps {
  onNewGame(): void;
}

const HEART_SLOTS = Array.from({ length: INITIAL_LIVES }, (_, index) => index);

export default function Header({ onNewGame }: HeaderProps) {
  const game = useGame();
  const filledHearts = game.state.lives;
  const notesToggleClass = game.notesMode ? styles.actionActive : styles.action;

  return (
    <header className={styles.header} data-testid="header">
      <div className={styles.timer} data-testid="timer">
        {formatTime(game.state.elapsedSeconds)}
      </div>

      <div className={styles.lives} data-testid="lives" aria-label={`Жизни: ${filledHearts}`}>
        {HEART_SLOTS.map((slot) => {
          const isFilled = slot < filledHearts;
          return (
            <span key={slot} className={isFilled ? styles.heartFull : styles.heartEmpty}>
              {isFilled ? '♥' : '♡'}
            </span>
          );
        })}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          data-testid="undo"
          disabled={!game.canUndo}
          onClick={game.undo}
          aria-label="Отменить ход"
        >
          ↶
        </button>
        <button
          type="button"
          className={notesToggleClass}
          data-testid="notes-toggle"
          aria-pressed={game.notesMode}
          onClick={game.toggleNotesMode}
          aria-label="Режим заметок"
        >
          ✎
        </button>
        <button
          type="button"
          className={styles.action}
          data-testid="new-game"
          onClick={onNewGame}
        >
          Новая
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Реализовать `src/components/header/Header.module.css`**

```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  max-width: min(92vw, 540px);
  margin: 0 auto;
  box-sizing: border-box;
}

.timer {
  font-variant-numeric: tabular-nums;
  font-size: 18px;
  font-weight: 700;
  color: var(--cell-text, #1b2430);
  min-width: 56px;
}

.lives {
  display: flex;
  gap: 2px;
  font-size: 20px;
}
.heartFull {
  color: var(--heart-full, #e5484d);
}
.heartEmpty {
  color: var(--heart-empty, #cbd5e1);
}

.actions {
  display: flex;
  gap: 8px;
}

.action,
.actionActive {
  min-height: 44px;
  min-width: 44px;
  padding: 0 12px;
  font-size: 16px;
  font-weight: 600;
  border: 1px solid var(--pad-border, #cbd5e1);
  border-radius: 10px;
  background: var(--pad-bg, #f8fafc);
  color: var(--pad-text, #1b2430);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.actionActive {
  background: var(--selected-bg, #a9c7f5);
  border-color: var(--cell-editable, #2563eb);
}
.action:disabled {
  opacity: 0.4;
  cursor: default;
}
```

- [ ] **Step 5: Запустить — PASS**

Run: `npm test -- Header`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/header/Header.tsx src/components/header/Header.module.css src/components/header/Header.test.tsx
git commit -m "feat: Header с таймером, жизнями, undo и toggle заметок (Phase 4-5)"
```

---

### Task 13: DifficultyPicker

**Files:**
- Create: `src/components/difficulty/DifficultyPicker.tsx`
- Create: `src/components/difficulty/DifficultyPicker.module.css`
- Create: `src/components/difficulty/DifficultyPicker.test.tsx`

**Interfaces:**
- Consumes: `type Difficulty` из `../../core`.
- Produces:
  - `interface DifficultyPickerProps { onPick(difficulty: Difficulty): void; onCancel(): void }`
  - `default` экспорт `DifficultyPicker`.
- `data-testid`: `difficulty-picker`, `difficulty-easy` / `difficulty-medium` / `difficulty-hard`, `difficulty-cancel`.

- [ ] **Step 1: Написать падающий тест**

`src/components/difficulty/DifficultyPicker.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import DifficultyPicker from './DifficultyPicker';

afterEach(cleanup);

describe('DifficultyPicker', () => {
  it('выбор сложности вызывает onPick с уровнем', () => {
    const onPick = vi.fn();
    render(<DifficultyPicker onPick={onPick} onCancel={() => {}} />);
    fireEvent.click(screen.getByTestId('difficulty-hard'));
    expect(onPick).toHaveBeenCalledWith('hard');
  });
  it('отмена вызывает onCancel', () => {
    const onCancel = vi.fn();
    render(<DifficultyPicker onPick={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('difficulty-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npm test -- DifficultyPicker`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/components/difficulty/DifficultyPicker.tsx`**

```tsx
import type { Difficulty } from '../../core';
import styles from './DifficultyPicker.module.css';

interface DifficultyPickerProps {
  onPick(difficulty: Difficulty): void;
  onCancel(): void;
}

interface DifficultyOption {
  value: Difficulty;
  label: string;
}

const OPTIONS: DifficultyOption[] = [
  { value: 'easy', label: 'Лёгкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'hard', label: 'Сложный' },
];

export default function DifficultyPicker({ onPick, onCancel }: DifficultyPickerProps) {
  return (
    <div className={styles.overlay} data-testid="difficulty-picker" role="dialog" aria-modal="true">
      <div className={styles.card}>
        <h2 className={styles.title}>Новая игра</h2>
        <div className={styles.options}>
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.option}
              data-testid={`difficulty-${option.value}`}
              onClick={() => onPick(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.cancel}
          data-testid="difficulty-cancel"
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Реализовать `src/components/difficulty/DifficultyPicker.module.css`**

```css
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  z-index: 20;
}

.card {
  background: var(--cell-bg, #fff);
  color: var(--cell-text, #1b2430);
  padding: 24px 28px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 260px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.title {
  margin: 0;
  font-size: 20px;
  text-align: center;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option {
  min-height: 48px;
  font-size: 16px;
  font-weight: 600;
  border: 1px solid var(--pad-border, #cbd5e1);
  border-radius: 10px;
  background: var(--pad-bg, #f8fafc);
  color: var(--pad-text, #1b2430);
  cursor: pointer;
}
.option:active {
  background: var(--selected-bg, #a9c7f5);
}

.cancel {
  min-height: 40px;
  font-size: 14px;
  border: none;
  background: transparent;
  color: var(--cell-editable, #2563eb);
  cursor: pointer;
}
```

- [ ] **Step 5: Запустить — PASS**

Run: `npm test -- DifficultyPicker`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/difficulty/DifficultyPicker.tsx src/components/difficulty/DifficultyPicker.module.css src/components/difficulty/DifficultyPicker.test.tsx
git commit -m "feat: DifficultyPicker для выбора сложности (Phase 4-5)"
```

---

### Task 14: WinScreen (won / lost)

**Files:**
- Create: `src/components/winscreen/WinScreen.tsx`
- Create: `src/components/winscreen/WinScreen.module.css`
- Create: `src/components/winscreen/WinScreen.test.tsx`

**Interfaces:**
- Consumes: `formatTime` из `../header/formatTime`.
- Produces:
  - `interface WinScreenProps { result: 'won' | 'lost'; elapsedSeconds: number; onNewGame(): void }`
  - `default` экспорт `WinScreen`.
- `data-testid`: `win-screen`, `win-screen-won` / `win-screen-lost`, `win-new-game`. При `won` показывает время.

- [ ] **Step 1: Написать падающий тест**

`src/components/winscreen/WinScreen.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import WinScreen from './WinScreen';

afterEach(cleanup);

describe('WinScreen', () => {
  it('режим победы показывает время', () => {
    render(<WinScreen result="won" elapsedSeconds={75} onNewGame={() => {}} />);
    expect(screen.getByTestId('win-screen-won')).toBeTruthy();
    expect(screen.getByTestId('win-screen').textContent).toContain('01:15');
  });
  it('режим поражения помечен своим testid', () => {
    render(<WinScreen result="lost" elapsedSeconds={40} onNewGame={() => {}} />);
    expect(screen.getByTestId('win-screen-lost')).toBeTruthy();
  });
  it('кнопка «Новая игра» вызывает onNewGame', () => {
    const onNewGame = vi.fn();
    render(<WinScreen result="won" elapsedSeconds={10} onNewGame={onNewGame} />);
    fireEvent.click(screen.getByTestId('win-new-game'));
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npm test -- WinScreen`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/components/winscreen/WinScreen.tsx`**

```tsx
import { formatTime } from '../header/formatTime';
import styles from './WinScreen.module.css';

interface WinScreenProps {
  result: 'won' | 'lost';
  elapsedSeconds: number;
  onNewGame(): void;
}

const CONTENT: Record<'won' | 'lost', { title: string; testid: string }> = {
  won: { title: 'Победа!', testid: 'win-screen-won' },
  lost: { title: 'Игра окончена', testid: 'win-screen-lost' },
};

export default function WinScreen({ result, elapsedSeconds, onNewGame }: WinScreenProps) {
  const content = CONTENT[result];
  const subtitle = result === 'won' ? `Время: ${formatTime(elapsedSeconds)}` : 'Закончились жизни';

  return (
    <div className={styles.overlay} data-testid="win-screen" role="dialog" aria-modal="true">
      <div className={styles.card} data-testid={content.testid}>
        <h2 className={styles.title}>{content.title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
        <button
          type="button"
          className={styles.newGame}
          data-testid="win-new-game"
          onClick={onNewGame}
        >
          Новая игра
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Реализовать `src/components/winscreen/WinScreen.module.css`**

```css
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  z-index: 10;
}

.card {
  background: var(--cell-bg, #fff);
  color: var(--cell-text, #1b2430);
  padding: 28px 32px;
  border-radius: 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.title {
  margin: 0;
  font-size: 24px;
}

.subtitle {
  margin: 0;
  font-size: 16px;
  color: var(--pad-text, #1b2430);
}

.newGame {
  min-height: 44px;
  padding: 0 20px;
  font-size: 16px;
  font-weight: 600;
  border: 1px solid var(--pad-border, #cbd5e1);
  border-radius: 10px;
  background: var(--pad-bg, #f8fafc);
  color: var(--pad-text, #1b2430);
  cursor: pointer;
}
```

- [ ] **Step 5: Запустить — PASS**

Run: `npm test -- WinScreen`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/winscreen/WinScreen.tsx src/components/winscreen/WinScreen.module.css src/components/winscreen/WinScreen.test.tsx
git commit -m "feat: WinScreen в режимах победы и поражения (Phase 4-5)"
```

---

### Task 15: Board/Cell — рендер заметок и подсветка ошибок

**Files:**
- Modify: `src/components/board/cellHighlight.ts`
- Modify: `src/components/board/cellHighlight.test.ts`
- Modify: `src/components/board/Cell.tsx`
- Modify: `src/components/board/Board.tsx`
- Modify: `src/components/board/Board.module.css`

**Interfaces:**
- `CellHighlight` получает поле `mistake: boolean`. `computeHighlight` принимает опциональный `mistakes?: boolean[][]` (по умолчанию все `false` — старый вызов без ошибок остаётся валидным).
- `CellProps` получает `notes?: number[]` (по умолчанию `[]`). Клетка рендерит мини-сетку кандидатов, если значение пустое и заметки не пусты.
- `BoardProps` получает `notes?: number[][][]` и `mistakes?: boolean[][]` (опциональны, чтобы сборка оставалась зелёной до переписывания `GameScreen` в Task 16; `GameScreen` всегда их передаёт).

> **Почему опционально:** между этой задачей и Task 16 старый `GameScreen`/`useGameBoard` ещё живы и вызывают `Board` без новых пропсов. Опциональные пропсы с дефолтами сохраняют компиляцию и зелёный `build` на каждом коммите.

- [ ] **Step 1: Обновить `cellHighlight.test.ts`**

Существующие тесты используют `toEqual({ selected, peer, sameValue, conflict })` — добавить в каждый ожидаемый объект `mistake: false`. Заменить три `expect(...).toEqual(...)`-объекта и добавить новый тест:

Заменить блок `it('без выбранной клетки — только конфликт', ...)`:
```ts
  it('без выбранной клетки — только конфликт', () => {
    const grid = emptyGrid();
    const conflicts = noConflicts();
    conflicts[3][3] = true;
    const highlight = computeHighlight({
      pos: { row: 3, col: 3 },
      selected: null,
      grid,
      conflicts,
    });
    expect(highlight).toEqual({
      selected: false,
      peer: false,
      sameValue: false,
      conflict: true,
      mistake: false,
    });
  });

  it('mistake прокидывается из массива mistakes', () => {
    const grid = emptyGrid();
    const mistakes = noConflicts();
    mistakes[2][2] = true;
    const highlight = computeHighlight({
      pos: { row: 2, col: 2 },
      selected: null,
      grid,
      conflicts: noConflicts(),
      mistakes,
    });
    expect(highlight.mistake).toBe(true);
  });
```

> Остальные существующие тесты используют частичные проверки (`highlight.selected`, `highlight.peer` и т.п.) и продолжат проходить без правок, кроме первого `toEqual`.

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- cellHighlight`
Expected: FAIL (нет `mistake` в результате; новый тест падает).

- [ ] **Step 3: Обновить `src/components/board/cellHighlight.ts`**

```ts
import { getBoxStart, EMPTY_CELL, type Grid } from '../../core';

export interface CellPosition {
  row: number;
  col: number;
}

export interface CellHighlight {
  selected: boolean;
  peer: boolean;
  sameValue: boolean;
  conflict: boolean;
  mistake: boolean;
}

/** true, если клетки a и b делят строку, столбец или блок 3×3 (та же клетка — тоже true). */
export function isSameUnit(a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row) return true;
  if (a.col === b.col) return true;
  const sameBoxRow = getBoxStart(a.row) === getBoxStart(b.row);
  const sameBoxCol = getBoxStart(a.col) === getBoxStart(b.col);
  return sameBoxRow && sameBoxCol;
}

interface ComputeHighlightArgs {
  pos: CellPosition;
  selected: CellPosition | null;
  grid: Grid;
  conflicts: boolean[][];
  mistakes?: boolean[][];
}

export function computeHighlight({
  pos,
  selected,
  grid,
  conflicts,
  mistakes,
}: ComputeHighlightArgs): CellHighlight {
  const conflict = conflicts[pos.row][pos.col];
  const mistake = mistakes?.[pos.row]?.[pos.col] ?? false;

  if (!selected) {
    return { selected: false, peer: false, sameValue: false, conflict, mistake };
  }

  const isSelectedCell = pos.row === selected.row && pos.col === selected.col;
  if (isSelectedCell) {
    return { selected: true, peer: false, sameValue: false, conflict, mistake };
  }

  const peer = isSameUnit(pos, selected);
  const cellValue = grid[pos.row][pos.col];
  const selectedValue = grid[selected.row][selected.col];
  const sameValue = cellValue !== EMPTY_CELL && cellValue === selectedValue;

  return { selected: false, peer, sameValue, conflict, mistake };
}
```

- [ ] **Step 4: Обновить `src/components/board/Cell.tsx`**

```tsx
import { memo } from 'react';
import { EMPTY_CELL } from '../../core';
import type { CellHighlight } from './cellHighlight';
import styles from './Board.module.css';

export interface CellProps {
  row: number;
  col: number;
  value: number;
  given: boolean;
  highlight: CellHighlight;
  notes?: number[];
  onSelect(args: { row: number; col: number }): void;
}

// Соответствие «флаг подсветки → CSS-класс». Порядок не важен: классы независимы.
const HIGHLIGHT_CLASSES: Array<{ active: (h: CellHighlight) => boolean; className: string }> = [
  { active: (h) => h.peer, className: styles.peer },
  { active: (h) => h.sameValue, className: styles.sameValue },
  { active: (h) => h.selected, className: styles.selected },
  { active: (h) => h.conflict, className: styles.conflict },
  { active: (h) => h.mistake, className: styles.mistake },
];

const NOTE_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function CellComponent({ row, col, value, given, highlight, notes = [], onSelect }: CellProps) {
  const highlightClasses = HIGHLIGHT_CLASSES.filter((entry) => entry.active(highlight)).map(
    (entry) => entry.className,
  );
  const givenClass = given ? styles.given : styles.editable;
  const className = [styles.cell, givenClass, ...highlightClasses].join(' ');

  const showNotes = value === EMPTY_CELL && notes.length > 0;
  const displayValue = value === EMPTY_CELL ? '' : String(value);

  return (
    <button
      type="button"
      className={className}
      data-testid={`cell-${row}-${col}`}
      onClick={() => onSelect({ row, col })}
    >
      {showNotes ? (
        <span className={styles.notes} data-testid={`notes-${row}-${col}`}>
          {NOTE_SLOTS.map((candidate) => (
            <span key={candidate} className={styles.note}>
              {notes.includes(candidate) ? candidate : ''}
            </span>
          ))}
        </span>
      ) : (
        displayValue
      )}
    </button>
  );
}

const Cell = memo(CellComponent);
export default Cell;
```

- [ ] **Step 5: Обновить `src/components/board/Board.tsx`**

```tsx
import { GRID_SIZE, type Grid } from '../../core';
import Cell from './Cell';
import { computeHighlight, type CellPosition } from './cellHighlight';
import styles from './Board.module.css';

export interface BoardProps {
  grid: Grid;
  conflicts: boolean[][];
  selected: CellPosition | null;
  cellIsGiven(row: number, col: number): boolean;
  onSelectCell(args: { row: number; col: number }): void;
  notes?: number[][][];
  mistakes?: boolean[][];
}

const ROW_INDICES = Array.from({ length: GRID_SIZE }, (_, index) => index);
const COL_INDICES = Array.from({ length: GRID_SIZE }, (_, index) => index);

export default function Board({
  grid,
  conflicts,
  selected,
  cellIsGiven,
  onSelectCell,
  notes,
  mistakes,
}: BoardProps) {
  return (
    <div className={styles.board} data-testid="board" role="grid">
      {ROW_INDICES.map((row) =>
        COL_INDICES.map((col) => {
          const pos = { row, col };
          const highlight = computeHighlight({ pos, selected, grid, conflicts, mistakes });
          return (
            <Cell
              key={`${row}-${col}`}
              row={row}
              col={col}
              value={grid[row][col]}
              given={cellIsGiven(row, col)}
              highlight={highlight}
              notes={notes?.[row]?.[col]}
              onSelect={onSelectCell}
            />
          );
        }),
      )}
    </div>
  );
}
```

- [ ] **Step 6: Дополнить `src/components/board/Board.module.css`**

Добавить в конец файла:
```css
/* Ошибочная клетка (значение ≠ решению) — механика жизней. */
.mistake {
  color: var(--mistake-text, #d93636);
  background: var(--mistake-bg, #ffd9d9);
}

/* Мини-сетка заметок-кандидатов внутри пустой клетки. */
.notes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 100%;
  height: 100%;
  font-size: clamp(7px, 1.9vmin, 12px);
  line-height: 1;
  color: var(--note-text, #64748b);
}
.note {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 7: Запустить тесты подсветки + сборку**

Run: `npm test -- cellHighlight && npm run build`
Expected: тесты подсветки PASS; сборка успешна (старый `GameScreen` компилируется — новые пропсы `Board`/`Cell` опциональны).

- [ ] **Step 8: Commit**

```bash
git add src/components/board/cellHighlight.ts src/components/board/cellHighlight.test.ts src/components/board/Cell.tsx src/components/board/Board.tsx src/components/board/Board.module.css
git commit -m "feat: Рендер заметок и подсветка ошибок в клетках (Phase 4-5)"
```

---

### Task 16: Переписать GameScreen на GameContext; удалить старый локальный стейт

**Files:**
- Modify: `src/components/game/GameScreen.tsx`
- Modify: `src/components/game/GameScreen.module.css`
- Modify: `src/components/game/GameScreen.test.tsx`
- Delete: `src/components/game/gameBoardReducer.ts`
- Delete: `src/components/game/gameBoardReducer.test.ts`
- Delete: `src/components/game/useGameBoard.ts`

**Interfaces:**
- Consumes: `useGame` из `../../state/GameContext`; `Board`, `NumberPad`, `Header`, `DifficultyPicker`, `WinScreen`; `type CellPosition` из `../board/cellHighlight`; `type Difficulty` из `../../core`.
- Produces: `default` экспорт `GameScreen` (без пропсов). Обёрнут провайдерами в `App` (Task 17), поэтому тест рендерит `GameScreen` внутри `GameProvider` + `AppProvider` — либо, т.к. `GameScreen` использует только `useGame`, достаточно `GameProvider`.
- `selected` и `pickerOpen` — локальный UI-стейт. Ввод цифры — `game.inputDigit`; при `won || lost` панель и поле заблокированы, показывается `WinScreen`.

- [ ] **Step 1: Переписать `src/components/game/GameScreen.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import GameScreen from './GameScreen';
import { GameProvider } from '../../state/GameContext';
import * as core from '../../core';
import type { Grid } from '../../core';

const solved: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];
function puzzleWithHoles(): Grid {
  const puzzle = solved.map((r) => [...r]);
  puzzle[0][0] = 0; // solution 5
  puzzle[0][1] = 0; // solution 3
  return puzzle;
}
function puzzleOneHole(): Grid {
  const puzzle = solved.map((r) => [...r]);
  puzzle[0][0] = 0; // solution 5
  return puzzle;
}

function mockPuzzle(puzzle: Grid) {
  vi.spyOn(core, 'generatePuzzle').mockReturnValue({ puzzle, solution: solved });
}

function renderScreen() {
  return render(
    <GameProvider>
      <GameScreen />
    </GameProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  mockPuzzle(puzzleWithHoles());
});
afterEach(cleanup);

describe('GameScreen', () => {
  it('рендерит поле, панель и хедер', () => {
    renderScreen();
    expect(screen.getByTestId('board')).toBeTruthy();
    expect(screen.getByTestId('numberpad')).toBeTruthy();
    expect(screen.getByTestId('header')).toBeTruthy();
  });

  it('ввод цифры заполняет выбранную клетку', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByTestId('digit-5'));
    expect(screen.getByTestId('cell-0-0').textContent).toBe('5');
  });

  it('в режиме заметок цифра становится кандидатом', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('notes-toggle'));
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByTestId('digit-4'));
    expect(screen.getByTestId('notes-0-0')).toBeTruthy();
  });

  it('ошибка снижает число жизней (одно сердце гаснет)', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByTestId('digit-1')); // неверно (solution 5)
    // Три слота, одно должно стать пустым ♡.
    expect(screen.getByTestId('lives').textContent).toContain('♡');
  });

  it('undo откатывает ход', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByTestId('digit-5'));
    expect(screen.getByTestId('cell-0-0').textContent).toBe('5');
    fireEvent.click(screen.getByTestId('undo'));
    expect(screen.getByTestId('cell-0-0').textContent).toBe('');
  });

  it('завершение партии показывает WinScreen (победа)', () => {
    mockPuzzle(puzzleOneHole());
    renderScreen();
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByTestId('digit-5')); // верно → победа
    expect(screen.getByTestId('win-screen-won')).toBeTruthy();
  });

  it('до конца партии WinScreen не показан', () => {
    renderScreen();
    expect(screen.queryByTestId('win-screen')).toBeNull();
  });

  it('«Новая» открывает выбор сложности', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('new-game'));
    expect(screen.getByTestId('difficulty-picker')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- GameScreen`
Expected: FAIL (старый `GameScreen` использует `useGameBoard`, нет Header/WinScreen/notes-toggle).

- [ ] **Step 3: Переписать `src/components/game/GameScreen.tsx`**

```tsx
import { useState } from 'react';
import type { Difficulty } from '../../core';
import { useGame } from '../../state/GameContext';
import Board from '../board/Board';
import type { CellPosition } from '../board/cellHighlight';
import NumberPad from '../numberpad/NumberPad';
import Header from '../header/Header';
import DifficultyPicker from '../difficulty/DifficultyPicker';
import WinScreen from '../winscreen/WinScreen';
import styles from './GameScreen.module.css';

export default function GameScreen() {
  const game = useGame();
  const [selected, setSelected] = useState<CellPosition | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectCell = ({ row, col }: CellPosition) => setSelected({ row, col });

  const inputDigit = (value: number) => {
    if (!selected) return;
    game.inputDigit({ row: selected.row, col: selected.col, value });
  };

  const eraseSelected = () => {
    if (!selected) return;
    game.erase({ row: selected.row, col: selected.col });
  };

  const openPicker = () => setPickerOpen(true);

  const startNewGame = (difficulty: Difficulty) => {
    game.newGame(difficulty);
    setSelected(null);
    setPickerOpen(false);
  };

  const gameOver = game.won || game.lost;
  const padDisabled = selected === null || gameOver;
  const winResult = game.won ? 'won' : 'lost';

  return (
    <div className={styles.screen}>
      <Header onNewGame={openPicker} />

      <div className={styles.boardArea}>
        <Board
          grid={game.state.currentGrid}
          notes={game.state.notes}
          conflicts={game.conflicts}
          mistakes={game.mistakes}
          selected={selected}
          cellIsGiven={game.cellIsGiven}
          onSelectCell={selectCell}
        />
      </div>

      <div className={styles.padArea}>
        <NumberPad onDigit={inputDigit} onErase={eraseSelected} disabled={padDisabled} />
      </div>

      {gameOver && (
        <WinScreen
          result={winResult}
          elapsedSeconds={game.state.elapsedSeconds}
          onNewGame={openPicker}
        />
      )}

      {pickerOpen && (
        <DifficultyPicker onPick={startNewGame} onCancel={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Обновить `src/components/game/GameScreen.module.css`**

Убрать неиспользуемые `.newGame`/`.winOverlay`/`.winCard`/`.winTitle` (переехали в Header/WinScreen). Оставить компоновку:
```css
.screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px;
  box-sizing: border-box;
  min-height: 100svh;
  position: relative;
}

.boardArea {
  width: 100%;
  display: flex;
  justify-content: center;
}

.padArea {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* Landscape / планшет: поле и панель бок о бок; хедер сверху на всю ширину. */
@media (orientation: landscape) {
  .screen {
    flex-flow: row wrap;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }
  .boardArea,
  .padArea {
    width: auto;
  }
}
```

> Хедер в landscape остаётся первым flex-элементом; при `row wrap` он переносится на первую строку. Достаточно для MVP; тонкая раскладка — вне объёма фазы.

- [ ] **Step 5: Удалить устаревшие файлы локального стейта**

```bash
git rm src/components/game/gameBoardReducer.ts src/components/game/gameBoardReducer.test.ts src/components/game/useGameBoard.ts
```

- [ ] **Step 6: Запустить тесты GameScreen**

Run: `npm test -- GameScreen`
Expected: PASS (все подтесты).

- [ ] **Step 7: Type-check (убедиться, что нет висячих импортов удалённых модулей)**

Run: `npm run type-check`
Expected: без ошибок.

- [ ] **Step 8: Commit**

```bash
git add src/components/game/GameScreen.tsx src/components/game/GameScreen.module.css src/components/game/GameScreen.test.tsx
git commit -m "feat: Переписать GameScreen на GameContext; удалить локальный стейт Фазы 3 (Phase 4-5)"
```

---

### Task 17: Подключить провайдеры в App, токены темы, полная проверка

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `AppProvider` из `./state/AppContext`; `GameProvider` из `./state/GameContext`; `GameScreen`.

- [ ] **Step 1: Обновить `src/App.tsx`**

```tsx
import { AppProvider } from './state/AppContext';
import { GameProvider } from './state/GameContext';
import GameScreen from './components/game/GameScreen';
import './App.css';

export default function App() {
  return (
    <AppProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </AppProvider>
  );
}
```

- [ ] **Step 2: Добавить токены новых цветов в `src/index.css`**

В блок `:root` добавить (рядом с существующими токенами) новые переменные для ошибок, заметок и жизней:
```css
  --mistake-bg: #ffd9d9;
  --mistake-text: #d93636;
  --note-text: #64748b;
  --heart-full: #e5484d;
  --heart-empty: #cbd5e1;
```
И в блок `@media (prefers-color-scheme: dark)` — тёмные варианты (по желанию, но для консистентности):
```css
@media (prefers-color-scheme: dark) {
  :root {
    --mistake-bg: #5b1d1d;
    --note-text: #94a3b8;
    --heart-empty: #3a4553;
  }
}
```

> Модульные CSS используют инлайн-фолбэки (`var(--x, #...)`), поэтому эти токены необязательны для работы, но задают единую тему. Если в `index.css` уже есть блок `@media (prefers-color-scheme: dark)` для `body` — добавь `:root`-блок отдельно, не ломая существующий.

- [ ] **Step 3: Полная проверка**

Run: `npm run type-check && npm run lint && npm test && npm run build`
Expected: type-check и lint без ошибок; все тесты (core + state + компоненты) зелёные; сборка успешна.

- [ ] **Step 4: Ручная проверка в браузере**

Run: `npm run dev`
Проверить глазами по чек-листу приёмки фазы:
- ход в клетку ставит цифру; таймер идёт (mm:ss растёт);
- **ошибка** (цифра ≠ решению) подсвечивает клетку красным и гасит одно «сердце»;
- **undo** откатывает последний ход, но **не возвращает** потраченную жизнь;
- режим заметок (toggle ✎): тап цифры добавляет/убирает кандидата; постановка цифры **автоочищает** этот кандидат у соседей по строке/столбцу/блоку; undo восстанавливает стёртые заметки;
- **перезагрузка страницы** (F5) восстанавливает партию (сетка, заметки, таймер, жизни);
- **0 жизней** показывает `WinScreen` в режиме поражения; победа — в режиме победы со временем;
- «Новая» открывает `DifficultyPicker`; выбор сложности стартует новую партию и сохраняет `lastDifficulty` (после перезагрузки без сохранённой партии стартует та же сложность).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/index.css
git commit -m "feat: Подключить провайдеры игры и токены темы (Phase 4-5)"
```

---

### Task 18: Обновить трекинг и финализировать ветку

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md`

- [ ] **Step 1: Обновить роадмап**

В `docs/roadmap.md` перевести на `✅ готово` **три строки** (все три — этой фазы), проставив ветку `feat/phase-4-5-game-engine` и «Завершено» `2026-07-03`:
- «Состояние и сохранение (GameContext, reducer, localStorage-персистентность, восстановление)»;
- «Доп. механики (заметки с автоочисткой, полный undo, таймер с паузой, выбор сложности, новая игра)»;
- «Механика жизней (3 жизни, ошибка = цифра ≠ решению, проигрыш при 0)».

- [ ] **Step 2: Отметить фазы в индексе планов**

В `docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md`, строки Фаз 4 и 5 таблицы: столбец «План» → ссылка `[phase-4-5-game-engine.md](2026-07-03-phase-4-5-game-engine.md)` (обе фазы ссылаются на общий план), «Статус детализации» → `✅ реализован (2026-07-03, feat/phase-4-5-game-engine)`. Добавить примечание, что Фазы 4 и 5 реализованы единым планом.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap.md docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md
git commit -m "docs: Отметить завершение игрового движка (Phase 4-5)"
```

- [ ] **Step 4: Финализация ветки**

Использовать `superpowers:finishing-a-development-branch`.

---

## Self-Review

**1. Spec coverage (design §2–3, §6; роадмап):**
- `GameState` по design §2 (`puzzleId`, `initialGrid`/`currentGrid`, `notes: number[][][]`, `history`, `lives`, `elapsedSeconds`, `startedAt`, `status`, `result?`) — Task 1. ✓
- `Move` + `CellNotesSnapshot` с `clearedNotes`/`wasMistake` — Task 1. ✓
- Actions `PLACE_DIGIT`/`TOGGLE_NOTE`/`ERASE`/`UNDO`/`TICK`/`NEW_GAME`/`RESTORE` через `Record<ActionType, handler>` — Tasks 2–6. ✓
- Логика хода (wasMistake → lives-1 → автоочистка соседей → loss при lives 0 → win при isSolved), порядок «loss раньше win» — Task 3. ✓
- Undo: полный откат currentGrid + восстановление clearedNotes; жизнь не возвращается — Task 6. ✓
- Автоочистка кандидатов у соседей строки/столбца/блока — Task 3 (`autoclearNotes`, Task 2). ✓
- Таймер: `elapsedSeconds`, TICK в компоненте (не reducer), пауза по `document.hidden` — Task 10 (`useGameTimer`). ✓
- Сохранение: localStorage `sudoku:game`, debounce ~400 мс, реже для тиков (flush 5 с + visibilitychange), восстановление in_progress совместимой версии — Tasks 7, 10. ✓
- Настройки: `sudoku:settings` (notesMode, lastDifficulty, iosInstallPromptDismissed), schemaVersion — Task 8, синхронизация в Task 10. ✓
- `activeView: 'game' | 'stats'` заложен — Task 9. ✓ (экран статистики — Фаза 6)
- UI: toggle заметок, Undo (disabled на пустой истории), жизни-сердца в Header, DifficultyPicker при New Game, WinScreen won/lost — Tasks 12–14, 16. ✓
- Заметки number[][][] сериализуемы (Set не используется) — Tasks 1, 7 (тест сериализации). ✓
- CompletedGame в IndexedDB НЕ пишется (Фаза 6) — только status/result в GameState. ✓
- Vitest на reducer (жизни, автоочистка+undo точный откат, 0 жизней→lost) и storage (schemaVersion, notes number[][][]) — Tasks 2–6, 7, 8. ✓ (design §6)
- Перенос reducer в `state/`, удаление локального стейта Фазы 3 — Task 16. ✓

**2. Placeholder scan:** код приведён полностью в каждом шаге; нет TODO/«обработать ошибки»/«аналогично Task N». Единственное переходное состояние — неполный `HANDLERS` между Tasks 2 и 6 — явно помечено и закрывается в Task 6.

**3. Type consistency:**
- `GameState`/`Move`/`CellNotesSnapshot`/`GameAction`/`Settings` (Task 1) — потребляются reducer (Tasks 2–6), storage (7–8), context (10): имена полей сверены (`currentGrid`, `initialGrid`, `clearedNotes`, `prevNotes`, `wasMistake`, `wasNote`).
- `createInitialGameState`/`gameReducer`/`isGiven`/`createEmptyNotes` (Task 2) → `GameProvider` (Task 10): согласовано.
- Приватные хелперы `withCellValue`/`cloneNotes`/`autoclearNotes` объявлены в Task 2, используются в Tasks 3–6.
- `GameApi` (Task 10: `state`, `conflicts`, `mistakes`, `won`, `lost`, `canUndo`, `notesMode`, `cellIsGiven`, `inputDigit`, `erase`, `undo`, `newGame`, `toggleNotesMode`) — потребляется Header (Task 12) и GameScreen (Task 16): сигнатуры совпадают.
- `CellHighlight.mistake` (Task 15) — используется Cell `HIGHLIGHT_CLASSES`; `computeHighlight` `mistakes?` — Board передаёт `game.mistakes`.
- `BoardProps` (`grid`, `conflicts`, `selected`, `cellIsGiven`, `onSelectCell`, `notes?`, `mistakes?`) — вызов в GameScreen передаёт `currentGrid`/`notes`/`mistakes`: совпадает.
- `WinScreenProps`/`DifficultyPickerProps`/`HeaderProps` — вызовы в GameScreen совпадают по именам и типам.
- Storage: `GAME_STORAGE_KEY`/`GAME_SCHEMA_VERSION`, `SETTINGS_STORAGE_KEY`/`SETTINGS_SCHEMA_VERSION` — согласованы между storage и тестами.
- Core-сигнатуры (`generatePuzzle`→`{puzzle,solution}`, `findConflicts`→`boolean[][]`, `isSolved`, `getBoxStart`, `cloneGrid`, `EMPTY_CELL`, `GRID_SIZE`, `BOX_SIZE`) сверены с реальным `src/core`.

**Примечание об options-объектах (CLAUDE.md):** многопараметрические/однотипные вызовы приняты объектом (`inputDigit({row,col,value})`, `erase({row,col})`, `computeHighlight({...})`, `autoclearNotes` — позиционные `notes,row,col,value`: тип `notes` отличается от трёх `number`, но три подряд `number` — пограничный случай; при исполнении допустимо перевести на объект `{ notes, row, col, value }`, не блокер). `isGiven(state,row,col)`/`cellIsGiven(row,col)` оставлены позиционными по прецеденту Фазы 3.

**Примечание о `RESTORE` (зафиксированное отклонение):** восстановление на старте выполняет ленивый инициализатор `useReducer` (`initGameState` → `loadGame()`), а не dispatch `RESTORE` — чтобы избежать лишней генерации головоломки. `RESTORE` реализован и юнит-тестируется как контракт reducer (design §2), доступен для программного внедрения состояния. Это осознанное решение по читаемости/производительности, а не пропуск требования.
