# Фаза 3: Игровое поле (рендер / ввод / подсветка / детект победы) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Отрисовать интерактивную сетку судоку 9×9: генерация головоломки, тап клетки → тап цифры в NumberPad ставит/стирает число, подсветка (одинаковые цифры, строка/столбец/блок, конфликты), детект победы.

**Architecture:** Тонкий UI-слой поверх готового `core/` ([ADR-0003](../../adr/0003-state-architecture.md)). Состояние партии держим **локально** в `useReducer` внутри хука `useGameBoard` (полноценный `GameContext` из фазы 4 ещё не существует — здесь допустим временный локальный стейт). Стили — CSS Modules ([ADR-0001](../../adr/0001-css-approach.md)). Классы подсветки вычисляются **чистыми функциями** в `cellHighlight.ts` (покрыты Vitest) и над `return` компонента, а не инлайн в JSX (CLAUDE.md: flat JSX).

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest + @testing-library/react.

## Global Constraints

- **Слои:** `components → state → core`; `core/` не трогаем, только потребляем ([ADR-0003](../../adr/0003-state-architecture.md)).
- **Стили:** CSS Modules (`*.module.css`) рядом с компонентами; общие токены — CSS-переменные ([ADR-0001](../../adr/0001-css-approach.md)).
- **Читаемость (CLAUDE.md):** без вложенных тернарников; описательные имена (не `s`, `p`, `mod`); options-объект при 3+ параметрах / при 2 однотипных / при boolean-параметре; flat JSX (классы подсветки — над `return`); lookup-структуры вместо `if`/`switch`-цепочек.
- **E2E-готовность:** `data-testid` на всех интерактивных элементах (клетки, кнопки цифр, Erase, New Game).
- **Адаптивность:** контейнер flex; portrait — Board сверху, NumberPad снизу; landscape/планшет — бок о бок (media query по ориентации). Тап-зоны ≥44×44px.
- **Git:** ветка `feat/phase-3-board` (НЕ `main`); коммит на задачу; сообщения `<type>: <описание> (Phase 3)`.
- **Grid:** 9×9, `0` = пусто (`EMPTY_CELL`). Типы и функции из `src/core` (barrel `src/core/index.ts`).

### Реальные сигнатуры `core/` (потребляются этой фазой)

```ts
// src/core/types.ts
type Difficulty = 'easy' | 'medium' | 'hard';
type Grid = number[][];            // 9×9, 0 = пусто
const GRID_SIZE = 9;
const BOX_SIZE = 3;
const EMPTY_CELL = 0;

// src/core/generator.ts
function generatePuzzle(difficulty: Difficulty): { puzzle: Grid; solution: Grid };

// src/core/validator.ts
function findConflicts(grid: Grid): boolean[][];   // true в дублирующихся непустых клетках
function isSolved(grid: Grid): boolean;            // заполнено и без конфликтов

// src/core/grid.ts
function getBoxStart(index: number): number;       // начало блока 3×3 для строки/столбца
function cloneGrid(grid: Grid): Grid;
```

Всё доступно через barrel: `import { generatePuzzle, findConflicts, isSolved, getBoxStart, EMPTY_CELL, GRID_SIZE, type Grid, type Difficulty } from '../../core';` (путь корректируется под расположение файла).

## File Structure

| Файл | Ответственность |
|---|---|
| `src/components/board/cellHighlight.ts` | Чистые функции подсветки: `isSameUnit`, `computeHighlight`. Покрыты Vitest. |
| `src/components/board/cellHighlight.test.ts` | Unit-тесты логики подсветки. |
| `src/components/board/Cell.tsx` | Одна клетка сетки (тонкая, `React.memo`). |
| `src/components/board/Board.tsx` | Сетка 9×9 (CSS Grid), раскладывает `Cell`, вычисляет подсветку над `return`. |
| `src/components/board/Board.module.css` | Сетка `aspect-ratio: 1`, границы блоков, классы подсветки. |
| `src/components/numberpad/NumberPad.tsx` | Кнопки 1–9 + Erase. |
| `src/components/numberpad/NumberPad.module.css` | Раскладка панели, тап-зоны ≥44px. |
| `src/components/game/gameBoardReducer.ts` | Локальный reducer партии (временный стейт фазы 3). Диспетч через `Record<ActionType, handler>`. |
| `src/components/game/gameBoardReducer.test.ts` | Unit-тесты reducer (постановка, стирание, защита givens, победа). |
| `src/components/game/useGameBoard.ts` | Хук: `useReducer` + derived `conflicts`/`solved`, экшены. |
| `src/components/game/GameScreen.tsx` | Компоновка Board+NumberPad, выбор клетки, оверлей победы. |
| `src/components/game/GameScreen.module.css` | Адаптивная компоновка (portrait/landscape). |
| `src/App.tsx` | Заменить болванку Vite на `<GameScreen />`. |
| `src/App.css`, `src/index.css` | Убрать демо-стили Vite, оставить базовый reset + токены. |

---

### Task 1: Чистая логика подсветки клеток

**Files:**
- Create: `src/components/board/cellHighlight.ts`
- Test: `src/components/board/cellHighlight.test.ts`

**Interfaces:**
- Consumes: `getBoxStart`, `EMPTY_CELL`, `GRID_SIZE`, `type Grid` из `src/core`.
- Produces:
  - `type CellPosition = { row: number; col: number }`
  - `isSameUnit(a: CellPosition, b: CellPosition): boolean` — `a` и `b` в одной строке, столбце ИЛИ блоке 3×3 (для `a === b` возвращает `true`).
  - `type CellHighlight = { selected: boolean; peer: boolean; sameValue: boolean; conflict: boolean }`
  - `computeHighlight(args: { pos: CellPosition; selected: CellPosition | null; grid: Grid; conflicts: boolean[][] }): CellHighlight` — статус подсветки одной клетки относительно выбранной. `peer` = в одном юните с выбранной (но не сама выбранная). `sameValue` = непустое значение клетки равно значению выбранной (и не сама выбранная). `conflict` = `conflicts[row][col]`.

- [ ] **Step 1: Написать падающие тесты**

`src/components/board/cellHighlight.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isSameUnit, computeHighlight } from './cellHighlight';
import type { Grid } from '../../core';

const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));
const noConflicts = (): boolean[][] => Array.from({ length: 9 }, () => Array(9).fill(false));

describe('isSameUnit', () => {
  it('true для одной строки', () => {
    expect(isSameUnit({ row: 0, col: 0 }, { row: 0, col: 8 })).toBe(true);
  });
  it('true для одного столбца', () => {
    expect(isSameUnit({ row: 0, col: 0 }, { row: 8, col: 0 })).toBe(true);
  });
  it('true для одного блока 3×3', () => {
    expect(isSameUnit({ row: 0, col: 0 }, { row: 2, col: 2 })).toBe(true);
  });
  it('true для той же клетки', () => {
    expect(isSameUnit({ row: 4, col: 4 }, { row: 4, col: 4 })).toBe(true);
  });
  it('false для несвязанных клеток', () => {
    expect(isSameUnit({ row: 0, col: 0 }, { row: 5, col: 8 })).toBe(false);
  });
});

describe('computeHighlight', () => {
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
    expect(highlight).toEqual({ selected: false, peer: false, sameValue: false, conflict: true });
  });

  it('сама выбранная клетка помечена selected, не peer и не sameValue', () => {
    const grid = emptyGrid();
    grid[4][4] = 7;
    const highlight = computeHighlight({
      pos: { row: 4, col: 4 },
      selected: { row: 4, col: 4 },
      grid,
      conflicts: noConflicts(),
    });
    expect(highlight.selected).toBe(true);
    expect(highlight.peer).toBe(false);
    expect(highlight.sameValue).toBe(false);
  });

  it('клетка в одном столбце с выбранной — peer', () => {
    const grid = emptyGrid();
    const highlight = computeHighlight({
      pos: { row: 0, col: 4 },
      selected: { row: 8, col: 4 },
      grid,
      conflicts: noConflicts(),
    });
    expect(highlight.peer).toBe(true);
    expect(highlight.selected).toBe(false);
  });

  it('одинаковое значение подсвечивается как sameValue', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    grid[8][8] = 5; // не в одном юните с выбранной
    const highlight = computeHighlight({
      pos: { row: 8, col: 8 },
      selected: { row: 0, col: 0 },
      grid,
      conflicts: noConflicts(),
    });
    expect(highlight.sameValue).toBe(true);
    expect(highlight.peer).toBe(false);
  });

  it('пустая клетка не даёт sameValue', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    const highlight = computeHighlight({
      pos: { row: 8, col: 8 },
      selected: { row: 0, col: 0 },
      grid,
      conflicts: noConflicts(),
    });
    expect(highlight.sameValue).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- cellHighlight`
Expected: FAIL — модуль `./cellHighlight` не найден.

- [ ] **Step 3: Реализовать `src/components/board/cellHighlight.ts`**

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
}

export function computeHighlight({
  pos,
  selected,
  grid,
  conflicts,
}: ComputeHighlightArgs): CellHighlight {
  const conflict = conflicts[pos.row][pos.col];

  if (!selected) {
    return { selected: false, peer: false, sameValue: false, conflict };
  }

  const isSelectedCell = pos.row === selected.row && pos.col === selected.col;
  if (isSelectedCell) {
    return { selected: true, peer: false, sameValue: false, conflict };
  }

  const peer = isSameUnit(pos, selected);

  const cellValue = grid[pos.row][pos.col];
  const selectedValue = grid[selected.row][selected.col];
  const sameValue = cellValue !== EMPTY_CELL && cellValue === selectedValue;

  return { selected: false, peer, sameValue, conflict };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- cellHighlight`
Expected: PASS (все тесты).

- [ ] **Step 5: Commit**

```bash
git add src/components/board/cellHighlight.ts src/components/board/cellHighlight.test.ts
git commit -m "feat: Добавить чистую логику подсветки клеток (Phase 3)"
```

---

### Task 2: Reducer локальной партии

**Files:**
- Create: `src/components/game/gameBoardReducer.ts`
- Test: `src/components/game/gameBoardReducer.test.ts`

**Interfaces:**
- Consumes: `generatePuzzle`, `cloneGrid`, `EMPTY_CELL`, `type Grid`, `type Difficulty` из `src/core`.
- Produces:
  - `interface GameBoardState { puzzle: Grid; solution: Grid; grid: Grid; difficulty: Difficulty }`
    - `puzzle` — исходная головоломка (givens неизменны); `grid` — текущее состояние; `solution` — эталон (для будущих фаз, здесь только хранится).
  - `type GameBoardAction = { type: 'PLACE_DIGIT'; row: number; col: number; value: number } | { type: 'ERASE'; row: number; col: number } | { type: 'NEW_GAME'; difficulty: Difficulty }`
  - `isGiven(state: GameBoardState, row: number, col: number): boolean` — клетка задана головоломкой (не редактируется).
  - `createInitialState(difficulty: Difficulty): GameBoardState`
  - `gameBoardReducer(state: GameBoardState, action: GameBoardAction): GameBoardState` — диспетчеризация через `Record<GameBoardAction['type'], handler>` (не switch-цепочка).

Правила фазы 3 (без жизней/заметок/undo — они в фазах 4–5):
- `PLACE_DIGIT` в given-клетку — no-op (возвращает тот же state).
- `PLACE_DIGIT` — иммутабельно записывает `value` в `grid[row][col]` (неверная цифра тоже вписывается — её видно и можно перезаписать; проверка ошибки/жизни — фаза 5).
- `ERASE` в given-клетку — no-op; иначе ставит `EMPTY_CELL`.
- `NEW_GAME` — новая головоломка выбранной сложности.

- [ ] **Step 1: Написать падающие тесты**

`src/components/game/gameBoardReducer.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  gameBoardReducer,
  isGiven,
  type GameBoardState,
} from './gameBoardReducer';
import { EMPTY_CELL, type Grid } from '../../core';

// Ищет пустую (редактируемую) клетку в исходной головоломке.
function findEditable(state: GameBoardState): { row: number; col: number } {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (state.puzzle[row][col] === EMPTY_CELL) return { row, col };
    }
  }
  throw new Error('нет пустых клеток — головоломка невозможна');
}

// Ищет заданную (given) клетку.
function findGivenCell(state: GameBoardState): { row: number; col: number } {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (state.puzzle[row][col] !== EMPTY_CELL) return { row, col };
    }
  }
  throw new Error('нет заданных клеток');
}

describe('createInitialState', () => {
  it('grid стартует как копия puzzle', () => {
    const state = createInitialState('easy');
    expect(state.grid).toEqual(state.puzzle);
  });
  it('grid — независимая копия (мутация не задевает puzzle)', () => {
    const state = createInitialState('easy');
    state.grid[0][0] = 9;
    expect(state.puzzle[0][0]).not.toBe(9);
  });
  it('хранит выбранную сложность', () => {
    expect(createInitialState('hard').difficulty).toBe('hard');
  });
});

describe('isGiven', () => {
  it('true для заданной клетки, false для пустой', () => {
    const state = createInitialState('easy');
    const given = findGivenCell(state);
    const editable = findEditable(state);
    expect(isGiven(state, given.row, given.col)).toBe(true);
    expect(isGiven(state, editable.row, editable.col)).toBe(false);
  });
});

describe('PLACE_DIGIT', () => {
  it('вписывает цифру в редактируемую клетку', () => {
    const state = createInitialState('easy');
    const { row, col } = findEditable(state);
    const next = gameBoardReducer(state, { type: 'PLACE_DIGIT', row, col, value: 5 });
    expect(next.grid[row][col]).toBe(5);
  });
  it('не мутирует исходный state (иммутабельность)', () => {
    const state = createInitialState('easy');
    const { row, col } = findEditable(state);
    gameBoardReducer(state, { type: 'PLACE_DIGIT', row, col, value: 5 });
    expect(state.grid[row][col]).toBe(EMPTY_CELL);
  });
  it('given-клетка не меняется (no-op)', () => {
    const state = createInitialState('easy');
    const { row, col } = findGivenCell(state);
    const original = state.grid[row][col];
    const next = gameBoardReducer(state, { type: 'PLACE_DIGIT', row, col, value: 1 });
    expect(next.grid[row][col]).toBe(original);
  });
  it('вписывает даже неверную цифру (проверка ошибок — фаза 5)', () => {
    const state = createInitialState('easy');
    const { row, col } = findEditable(state);
    const wrong = state.solution[row][col] === 1 ? 2 : 1;
    const next = gameBoardReducer(state, { type: 'PLACE_DIGIT', row, col, value: wrong });
    expect(next.grid[row][col]).toBe(wrong);
  });
});

describe('ERASE', () => {
  it('очищает редактируемую клетку', () => {
    const state = createInitialState('easy');
    const { row, col } = findEditable(state);
    const placed = gameBoardReducer(state, { type: 'PLACE_DIGIT', row, col, value: 5 });
    const erased = gameBoardReducer(placed, { type: 'ERASE', row, col });
    expect(erased.grid[row][col]).toBe(EMPTY_CELL);
  });
  it('given-клетку не стирает', () => {
    const state = createInitialState('easy');
    const { row, col } = findGivenCell(state);
    const original = state.grid[row][col];
    const next = gameBoardReducer(state, { type: 'ERASE', row, col });
    expect(next.grid[row][col]).toBe(original);
  });
});

describe('NEW_GAME', () => {
  it('создаёт новую партию заданной сложности', () => {
    const state = createInitialState('easy');
    const next = gameBoardReducer(state, { type: 'NEW_GAME', difficulty: 'hard' });
    expect(next.difficulty).toBe('hard');
    expect(next.grid).toEqual(next.puzzle);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- gameBoardReducer`
Expected: FAIL — модуль `./gameBoardReducer` не найден.

- [ ] **Step 3: Реализовать `src/components/game/gameBoardReducer.ts`**

```ts
import { generatePuzzle, cloneGrid, EMPTY_CELL, type Grid, type Difficulty } from '../../core';

export interface GameBoardState {
  puzzle: Grid;
  solution: Grid;
  grid: Grid;
  difficulty: Difficulty;
}

export type GameBoardAction =
  | { type: 'PLACE_DIGIT'; row: number; col: number; value: number }
  | { type: 'ERASE'; row: number; col: number }
  | { type: 'NEW_GAME'; difficulty: Difficulty };

export function createInitialState(difficulty: Difficulty): GameBoardState {
  const { puzzle, solution } = generatePuzzle(difficulty);
  return {
    puzzle,
    solution,
    grid: cloneGrid(puzzle),
    difficulty,
  };
}

export function isGiven(state: GameBoardState, row: number, col: number): boolean {
  return state.puzzle[row][col] !== EMPTY_CELL;
}

/** Иммутабельно записывает значение в клетку grid, возвращая новый grid. */
function withCell(grid: Grid, row: number, col: number, value: number): Grid {
  const next = cloneGrid(grid);
  next[row][col] = value;
  return next;
}

type Handler<A extends GameBoardAction> = (state: GameBoardState, action: A) => GameBoardState;

const placeDigit: Handler<Extract<GameBoardAction, { type: 'PLACE_DIGIT' }>> = (state, action) => {
  if (isGiven(state, action.row, action.col)) return state;
  return { ...state, grid: withCell(state.grid, action.row, action.col, action.value) };
};

const erase: Handler<Extract<GameBoardAction, { type: 'ERASE' }>> = (state, action) => {
  if (isGiven(state, action.row, action.col)) return state;
  return { ...state, grid: withCell(state.grid, action.row, action.col, EMPTY_CELL) };
};

const newGame: Handler<Extract<GameBoardAction, { type: 'NEW_GAME' }>> = (_state, action) =>
  createInitialState(action.difficulty);

const HANDLERS: {
  [K in GameBoardAction['type']]: Handler<Extract<GameBoardAction, { type: K }>>;
} = {
  PLACE_DIGIT: placeDigit,
  ERASE: erase,
  NEW_GAME: newGame,
};

export function gameBoardReducer(state: GameBoardState, action: GameBoardAction): GameBoardState {
  const handler = HANDLERS[action.type] as Handler<GameBoardAction>;
  return handler(state, action);
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- gameBoardReducer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/gameBoardReducer.ts src/components/game/gameBoardReducer.test.ts
git commit -m "feat: Добавить reducer локальной партии (Phase 3)"
```

---

### Task 3: Хук useGameBoard

**Files:**
- Create: `src/components/game/useGameBoard.ts`

**Interfaces:**
- Consumes: `gameBoardReducer`, `createInitialState`, `isGiven`, `type GameBoardState`, `type Difficulty`; `findConflicts`, `isSolved` из `src/core`.
- Produces:
  - `interface UseGameBoard { state: GameBoardState; conflicts: boolean[][]; solved: boolean; placeDigit(args: { row: number; col: number; value: number }): void; erase(args: { row: number; col: number }): void; newGame(difficulty: Difficulty): void; cellIsGiven(row: number, col: number): boolean }`
  - `useGameBoard(initialDifficulty: Difficulty): UseGameBoard`
- `conflicts` и `solved` — производные (derived) через `useMemo` от `state.grid`, не хранятся в reducer.

- [ ] **Step 1: Реализовать хук (без отдельного unit-теста — покрывается тестами reducer + компонентным тестом GameScreen)**

`src/components/game/useGameBoard.ts`:
```ts
import { useMemo, useReducer } from 'react';
import { findConflicts, isSolved, type Difficulty } from '../../core';
import {
  createInitialState,
  gameBoardReducer,
  isGiven,
  type GameBoardState,
} from './gameBoardReducer';

export interface UseGameBoard {
  state: GameBoardState;
  conflicts: boolean[][];
  solved: boolean;
  placeDigit(args: { row: number; col: number; value: number }): void;
  erase(args: { row: number; col: number }): void;
  newGame(difficulty: Difficulty): void;
  cellIsGiven(row: number, col: number): boolean;
}

export function useGameBoard(initialDifficulty: Difficulty): UseGameBoard {
  const [state, dispatch] = useReducer(gameBoardReducer, initialDifficulty, createInitialState);

  const conflicts = useMemo(() => findConflicts(state.grid), [state.grid]);
  const solved = useMemo(() => isSolved(state.grid), [state.grid]);

  return {
    state,
    conflicts,
    solved,
    placeDigit: ({ row, col, value }) => dispatch({ type: 'PLACE_DIGIT', row, col, value }),
    erase: ({ row, col }) => dispatch({ type: 'ERASE', row, col }),
    newGame: (difficulty) => dispatch({ type: 'NEW_GAME', difficulty }),
    cellIsGiven: (row, col) => isGiven(state, row, col),
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/useGameBoard.ts
git commit -m "feat: Добавить хук useGameBoard с derived-состоянием (Phase 3)"
```

---

### Task 4: Компонент Cell

**Files:**
- Create: `src/components/board/Cell.tsx`

**Interfaces:**
- Consumes: `type CellHighlight` из `./cellHighlight`; `EMPTY_CELL` из `src/core`.
- Produces:
  - `interface CellProps { row: number; col: number; value: number; given: boolean; highlight: CellHighlight; onSelect(args: { row: number; col: number }): void }`
  - `default` экспорт мемоизированного `Cell`.
- Классы подсветки собираются **над `return`** (не инлайн). `data-testid={`cell-${row}-${col}`}`.

- [ ] **Step 1: Реализовать `src/components/board/Cell.tsx`**

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
  onSelect(args: { row: number; col: number }): void;
}

// Соответствие «флаг подсветки → CSS-класс». Порядок не важен: классы независимы.
const HIGHLIGHT_CLASSES: Array<{ active: (h: CellHighlight) => boolean; className: string }> = [
  { active: (h) => h.peer, className: styles.peer },
  { active: (h) => h.sameValue, className: styles.sameValue },
  { active: (h) => h.selected, className: styles.selected },
  { active: (h) => h.conflict, className: styles.conflict },
];

function CellComponent({ row, col, value, given, highlight, onSelect }: CellProps) {
  const highlightClasses = HIGHLIGHT_CLASSES.filter((entry) => entry.active(highlight)).map(
    (entry) => entry.className,
  );
  const givenClass = given ? styles.given : styles.editable;
  const className = [styles.cell, givenClass, ...highlightClasses].join(' ');
  const displayValue = value === EMPTY_CELL ? '' : String(value);

  return (
    <button
      type="button"
      className={className}
      data-testid={`cell-${row}-${col}`}
      onClick={() => onSelect({ row, col })}
    >
      {displayValue}
    </button>
  );
}

const Cell = memo(CellComponent);
export default Cell;
```

- [ ] **Step 2: Type-check (CSS-классы могут ещё не существовать — это норма для `*.module.css` в TS, класс = `string | undefined`)**

Run: `npm run type-check`
Expected: без ошибок (модуль `Board.module.css` создаётся в Task 5; если type-check запускается до него — временно классы будут `undefined`, но типизация проходит. Если хочется избежать промежуточного состояния — выполняй Task 4 и 5 подряд, коммить после Task 5).

> **Примечание по порядку:** `Cell.tsx` импортирует `./Board.module.css`, который создаётся в Task 5. Чтобы не коммитить сломанную сборку, **не запускай `npm run build` до конца Task 5**. Type-check проходит, т.к. Vite-типизация CSS-модулей отдаёт `Record<string, string>`.

- [ ] **Step 3: Commit (вместе с Task 5 — см. ниже; здесь только фиксация файла в рабочем дереве)**

Файл будет закоммичен в Task 5 вместе с `Board.tsx` и `Board.module.css` (единый визуальный блок «сетка»).

---

### Task 5: Компонент Board + CSS сетки

**Files:**
- Create: `src/components/board/Board.tsx`
- Create: `src/components/board/Board.module.css`

**Interfaces:**
- Consumes: `Cell` (default) из `./Cell`; `computeHighlight`, `type CellPosition` из `./cellHighlight`; `GRID_SIZE`, `type Grid` из `src/core`.
- Produces:
  - `interface BoardProps { grid: Grid; conflicts: boolean[][]; selected: CellPosition | null; cellIsGiven(row: number, col: number): boolean; onSelectCell(args: { row: number; col: number }): void }`
  - `default` экспорт `Board`.
- Подсветку каждой клетки вычисляем над `return` (map по строкам/столбцам), НЕ инлайн в JSX.

- [ ] **Step 1: Реализовать `src/components/board/Board.tsx`**

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
}

const ROW_INDICES = Array.from({ length: GRID_SIZE }, (_, index) => index);
const COL_INDICES = Array.from({ length: GRID_SIZE }, (_, index) => index);

export default function Board({
  grid,
  conflicts,
  selected,
  cellIsGiven,
  onSelectCell,
}: BoardProps) {
  return (
    <div className={styles.board} data-testid="board" role="grid">
      {ROW_INDICES.map((row) =>
        COL_INDICES.map((col) => {
          const pos = { row, col };
          const highlight = computeHighlight({ pos, selected, grid, conflicts });
          return (
            <Cell
              key={`${row}-${col}`}
              row={row}
              col={col}
              value={grid[row][col]}
              given={cellIsGiven(row, col)}
              highlight={highlight}
              onSelect={onSelectCell}
            />
          );
        }),
      )}
    </div>
  );
}
```

- [ ] **Step 2: Реализовать `src/components/board/Board.module.css`**

```css
.board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(9, 1fr);
  aspect-ratio: 1;
  width: 100%;
  max-width: min(92vw, 70vh, 540px);
  margin: 0 auto;
  border: 3px solid var(--board-border, #344055);
  background: var(--board-border, #344055);
  gap: 1px;
  box-sizing: border-box;
  touch-action: manipulation;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: none;
  font: inherit;
  font-size: clamp(16px, 4.2vmin, 30px);
  line-height: 1;
  background: var(--cell-bg, #fff);
  color: var(--cell-text, #1b2430);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Толстые границы блоков 3×3: правый край столбцов 3 и 6, нижний край строк 3 и 6.
   Используем nth-child по позиции в 81-клеточной сетке (row-major). */
.cell:nth-child(3n):not(:nth-child(9n)) {
  border-right: 2px solid var(--board-border, #344055);
}
.cell:nth-child(n + 19):nth-child(-n + 27),
.cell:nth-child(n + 46):nth-child(-n + 54) {
  border-bottom: 2px solid var(--board-border, #344055);
}

.given {
  font-weight: 700;
  color: var(--cell-given, #10151d);
}
.editable {
  font-weight: 500;
  color: var(--cell-editable, #2563eb);
}

/* Подсветка: базовый peer → sameValue → selected по возрастанию заметности.
   Конфликт перекрывает цвет текста и фон. */
.peer {
  background: var(--peer-bg, #e8eef7);
}
.sameValue {
  background: var(--samevalue-bg, #cfe0f7);
}
.selected {
  background: var(--selected-bg, #a9c7f5);
}
.conflict {
  color: var(--conflict-text, #d93636);
  background: var(--conflict-bg, #fbdcdc);
}
```

> **Про границы блоков:** `.cell:nth-child(3n)` захватывает столбцы 3, 6, 9; `:not(:nth-child(9n))` исключает последний столбец (у него внешняя рамка). Для нижних границ строк 3 и 6 берём диапазоны клеток 19–27 (строка 3, 0-индексно строки 2) и 46–54 (строка 6). Это визуальные разделители блоков — не влияют на логику.

- [ ] **Step 3: Type-check + сборка**

Run: `npm run type-check && npm run build`
Expected: без ошибок; сборка проходит (Board.module.css теперь существует, Cell из Task 4 резолвится).

- [ ] **Step 4: Commit (Cell + Board + CSS — единый блок «сетка»)**

```bash
git add src/components/board/Cell.tsx src/components/board/Board.tsx src/components/board/Board.module.css
git commit -m "feat: Добавить рендер сетки 9×9 с подсветкой (Phase 3)"
```

---

### Task 6: Компонент NumberPad

**Files:**
- Create: `src/components/numberpad/NumberPad.tsx`
- Create: `src/components/numberpad/NumberPad.module.css`

**Interfaces:**
- Produces:
  - `interface NumberPadProps { onDigit(value: number): void; onErase(): void; disabled: boolean }`
    - `disabled` — когда клетка не выбрана / партия завершена: кнопки неактивны.
  - `default` экспорт `NumberPad`.
- `data-testid`: `digit-${n}` (1–9), `erase`.

- [ ] **Step 1: Реализовать `src/components/numberpad/NumberPad.tsx`**

```tsx
import styles from './NumberPad.module.css';

export interface NumberPadProps {
  onDigit(value: number): void;
  onErase(): void;
  disabled: boolean;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function NumberPad({ onDigit, onErase, disabled }: NumberPadProps) {
  return (
    <div className={styles.pad} data-testid="numberpad">
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          className={styles.key}
          data-testid={`digit-${digit}`}
          disabled={disabled}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        className={styles.erase}
        data-testid="erase"
        disabled={disabled}
        onClick={onErase}
      >
        ⌫
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Реализовать `src/components/numberpad/NumberPad.module.css`**

```css
.pad {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  width: 100%;
  max-width: min(92vw, 540px);
  margin: 0 auto;
  box-sizing: border-box;
}

.key,
.erase {
  min-height: 56px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(18px, 5vmin, 26px);
  font-weight: 600;
  border: 1px solid var(--pad-border, #cbd5e1);
  border-radius: 10px;
  background: var(--pad-bg, #f8fafc);
  color: var(--pad-text, #1b2430);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.key:active,
.erase:active {
  background: var(--pad-active-bg, #e2e8f0);
}

.key:disabled,
.erase:disabled {
  opacity: 0.4;
  cursor: default;
}

.erase {
  grid-column: span 2;
}

/* В landscape панель — вертикальная колонка рядом с полем. */
@media (orientation: landscape) {
  .pad {
    grid-template-columns: repeat(3, 1fr);
    max-width: 260px;
  }
}
```

- [ ] **Step 3: Type-check + сборка**

Run: `npm run type-check && npm run build`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add src/components/numberpad/NumberPad.tsx src/components/numberpad/NumberPad.module.css
git commit -m "feat: Добавить панель ввода цифр NumberPad (Phase 3)"
```

---

### Task 7: GameScreen — компоновка, выбор клетки, детект победы

**Files:**
- Create: `src/components/game/GameScreen.tsx`
- Create: `src/components/game/GameScreen.module.css`
- Test: `src/components/game/GameScreen.test.tsx`

**Interfaces:**
- Consumes: `useGameBoard`; `Board` (default); `NumberPad` (default); `type CellPosition` из `../board/cellHighlight`; `type Difficulty` из `src/core`.
- Produces: `default` экспорт `GameScreen` (без пропсов; сложность по умолчанию `'easy'`).
- Локальный `useState<CellPosition | null>` для выбранной клетки. Ввод: тап клетки → выбор; тап цифры → `placeDigit` в выбранную клетку. Победа: когда `solved` — показать оверлей `data-testid="win-overlay"` с кнопкой «Новая игра».

- [ ] **Step 1: Написать компонентный тест (падающий)**

`src/components/game/GameScreen.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import GameScreen from './GameScreen';
import * as core from '../../core';
import type { Grid } from '../../core';

// Детерминированная головоломка: одна пустая клетка [0][0], остальное решено.
// Позволяет проверить ввод и детект победы без случайной генерации.
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

function puzzleWithOneHole(): Grid {
  const puzzle = solved.map((row) => [...row]);
  puzzle[0][0] = 0; // единственная пустая клетка
  return puzzle;
}

beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.spyOn(core, 'generatePuzzle').mockReturnValue({
    puzzle: puzzleWithOneHole(),
    solution: solved,
  });
});

describe('GameScreen', () => {
  it('рендерит сетку и панель', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('board')).toBeTruthy();
    expect(screen.getByTestId('numberpad')).toBeTruthy();
  });

  it('given-клетка отображает своё значение', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('cell-0-1').textContent).toBe('3');
  });

  it('ввод цифры в выбранную клетку заполняет её', () => {
    render(<GameScreen />);
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByTestId('digit-5'));
    expect(screen.getByTestId('cell-0-0').textContent).toBe('5');
  });

  it('правильная последняя цифра завершает партию — показывает оверлей победы', () => {
    render(<GameScreen />);
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByTestId('digit-5')); // верное значение [0][0] = 5
    expect(screen.getByTestId('win-overlay')).toBeTruthy();
  });

  it('до победы оверлей не показан', () => {
    render(<GameScreen />);
    expect(screen.queryByTestId('win-overlay')).toBeNull();
  });
});
```

- [ ] **Step 2: Установить testing-library и настроить jsdom-окружение**

Проверить, установлены ли зависимости и настроен ли jsdom. Если нет:
```bash
npm install -D @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom
```
Настроить окружение jsdom для компонентных тестов. Добавить в `vite.config.ts` секцию `test` (если её ещё нет), с `environment: 'jsdom'`:
```ts
// В vite.config.ts, внутри defineConfig({...}) добавить (при отсутствии):
test: {
  environment: 'jsdom',
  globals: true,
},
```
> Если `test.environment` уже настроен как `node` для core-тестов — переопредели окружение только для компонентных тестов через комментарий-директиву в начале `GameScreen.test.tsx`:
> ```ts
> // @vitest-environment jsdom
> ```
> Это не влияет на core-тесты (они остаются в node). Предпочтителен вариант с директивой — он локален и не трогает конфиг core-тестов.

- [ ] **Step 3: Запустить — убедиться, что падает**

Run: `npm test -- GameScreen`
Expected: FAIL — модуль `./GameScreen` не найден.

- [ ] **Step 4: Реализовать `src/components/game/GameScreen.tsx`**

```tsx
import { useState } from 'react';
import type { Difficulty } from '../../core';
import Board from '../board/Board';
import type { CellPosition } from '../board/cellHighlight';
import NumberPad from '../numberpad/NumberPad';
import { useGameBoard } from './useGameBoard';
import styles from './GameScreen.module.css';

const DEFAULT_DIFFICULTY: Difficulty = 'easy';

export default function GameScreen() {
  const game = useGameBoard(DEFAULT_DIFFICULTY);
  const [selected, setSelected] = useState<CellPosition | null>(null);

  const selectCell = ({ row, col }: CellPosition) => setSelected({ row, col });

  const placeDigit = (value: number) => {
    if (!selected) return;
    game.placeDigit({ row: selected.row, col: selected.col, value });
  };

  const eraseSelected = () => {
    if (!selected) return;
    game.erase({ row: selected.row, col: selected.col });
  };

  const startNewGame = () => {
    game.newGame(game.state.difficulty);
    setSelected(null);
  };

  const padDisabled = selected === null || game.solved;

  return (
    <div className={styles.screen}>
      <div className={styles.boardArea}>
        <Board
          grid={game.state.grid}
          conflicts={game.conflicts}
          selected={selected}
          cellIsGiven={game.cellIsGiven}
          onSelectCell={selectCell}
        />
      </div>

      <div className={styles.padArea}>
        <NumberPad onDigit={placeDigit} onErase={eraseSelected} disabled={padDisabled} />
        <button
          type="button"
          className={styles.newGame}
          data-testid="new-game"
          onClick={startNewGame}
        >
          Новая игра
        </button>
      </div>

      {game.solved && (
        <div className={styles.winOverlay} data-testid="win-overlay" role="dialog">
          <div className={styles.winCard}>
            <h2 className={styles.winTitle}>Готово!</h2>
            <p>Судоку решено.</p>
            <button
              type="button"
              className={styles.newGame}
              data-testid="win-new-game"
              onClick={startNewGame}
            >
              Новая игра
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Реализовать `src/components/game/GameScreen.module.css`**

```css
.screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
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

/* Landscape / планшет: поле и панель бок о бок. */
@media (orientation: landscape) {
  .screen {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 32px;
  }
  .boardArea,
  .padArea {
    width: auto;
  }
}

.winOverlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  z-index: 10;
}

.winCard {
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

.winTitle {
  margin: 0;
  font-size: 24px;
}
```

- [ ] **Step 6: Запустить тесты — убедиться, что проходят**

Run: `npm test -- GameScreen`
Expected: PASS (все 5 тестов).

- [ ] **Step 7: Commit**

```bash
git add src/components/game/GameScreen.tsx src/components/game/GameScreen.module.css src/components/game/GameScreen.test.tsx vite.config.ts package.json package-lock.json
git commit -m "feat: Добавить экран игры с вводом и детектом победы (Phase 3)"
```

---

### Task 8: Подключить GameScreen к App, убрать демо Vite

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css` (очистить демо-стили)
- Modify: `src/index.css` (убрать демо-разметку `#root` шириной 1126px, оставить reset + токены цветов судоку)

**Interfaces:**
- Consumes: `GameScreen` (default).

- [ ] **Step 1: Заменить `src/App.tsx`**

```tsx
import GameScreen from './components/game/GameScreen';
import './App.css';

export default function App() {
  return <GameScreen />;
}
```

- [ ] **Step 2: Очистить `src/App.css`**

Заменить содержимое на минимум (демо-стили Vite удаляем):
```css
/* Стили игрового экрана живут в CSS-модулях компонентов.
   Здесь — только контейнер приложения. */
#root {
  min-height: 100svh;
}
```

- [ ] **Step 3: Заменить `src/index.css` на reset + токены судоку**

```css
:root {
  color-scheme: light dark;
  font-family: system-ui, 'Segoe UI', Roboto, sans-serif;

  --board-border: #344055;
  --cell-bg: #ffffff;
  --cell-text: #1b2430;
  --cell-given: #10151d;
  --cell-editable: #2563eb;

  --peer-bg: #e8eef7;
  --samevalue-bg: #cfe0f7;
  --selected-bg: #a9c7f5;
  --conflict-text: #d93636;
  --conflict-bg: #fbdcdc;

  --pad-bg: #f8fafc;
  --pad-active-bg: #e2e8f0;
  --pad-border: #cbd5e1;
  --pad-text: #1b2430;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  background: #eef2f7;
  color: var(--cell-text);
}

@media (prefers-color-scheme: dark) {
  body {
    background: #0f141b;
    color: #e6ebf2;
  }
}
```

> Демо-иконки (`src/assets/react.svg`, `vite.svg`, `hero.png`) больше не импортируются. Удалять их не обязательно (не ломают сборку); при желании подчистить — отдельным `chore`-коммитом, не в этой задаче.

- [ ] **Step 4: Полная проверка**

Run: `npm run type-check && npm run lint && npm test && npm run build`
Expected: type-check и lint без ошибок; все тесты (core + cellHighlight + gameBoardReducer + GameScreen) проходят; сборка успешна.

- [ ] **Step 5: Ручная визуальная проверка**

Run: `npm run dev`
Проверить глазами:
- сетка 9×9 рендерится с видимыми границами блоков 3×3;
- тап пустой клетки подсвечивает её (selected) + строку/столбец/блок (peer);
- тап цифры вписывает её в выбранную клетку; одинаковые цифры подсвечиваются (sameValue);
- дубль в строке/столбце/блоке краснеет (conflict);
- given-клетки не редактируются;
- при полном верном заполнении показывается оверлей победы; «Новая игра» стартует новую партию;
- в landscape поле и панель встают бок о бок; тап-зоны крупные.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.css src/index.css
git commit -m "feat: Подключить игровой экран к приложению (Phase 3)"
```

---

### Task 9: Обновить трекинг и финализировать ветку

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md`

- [ ] **Step 1: Обновить роадмап**

В `docs/roadmap.md` строку «Игровое поле …»: статус → `✅ готово`, ветка → `feat/phase-3-board`, «Завершено» → `2026-07-02` (или актуальная дата).

- [ ] **Step 2: Отметить фазу в индексе планов**

В `docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md`, строка Фазы 3 таблицы: столбец «План» → ссылка `[phase-3-board.md](2026-07-02-phase-3-board.md)`, «Статус детализации» → `✅ реализован (2026-07-02, feat/phase-3-board)`.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap.md docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md
git commit -m "docs: Отметить завершение игрового поля (Phase 3)"
```

- [ ] **Step 4: Финализация ветки**

Использовать `superpowers:finishing-a-development-branch`.

---

## Self-Review

**1. Spec coverage (design §4, spec §3.1/§8):**
- Рендер сетки 9×9 (CSS Grid, `aspect-ratio: 1`, границы блоков) — Task 5. ✓
- Ввод: тап клетки → тап цифры в NumberPad — Tasks 6, 7. ✓
- Подсветка: одинаковые цифры (`sameValue`), строка/столбец/блок (`peer`), конфликты через `findConflicts` (`conflict`) — Tasks 1, 4, 5. ✓
- Детект победы через `isSolved` — Tasks 3, 7. ✓
- Локальный стейт (useReducer), без GameContext — Tasks 2, 3. ✓ (GameContext вынесен в фазу 4).
- БЕЗ сохранения, таймера, заметок/undo/жизней — не реализуются (фазы 4–5). ✓
- CSS Modules — все компоненты. ✓ ([ADR-0001](../../adr/0001-css-approach.md))
- flat JSX, классы над `return` — Cell (`HIGHLIGHT_CLASSES`), Board (подсветка в map). ✓
- `data-testid` на интерактиве — cell, digit-N, erase, new-game, board, numberpad, win-overlay. ✓
- Адаптивность portrait/landscape — GameScreen.module.css + NumberPad.module.css media queries. ✓
- Тап-зоны ≥44px — `.key`/`.erase` min-height 56/min-width 44, `.newGame` min-height 44. ✓
- Диспетчеризация reducer через `Record` (не switch) — Task 2 `HANDLERS`. ✓ (index §"Диспетчеризация reducer")

**2. Placeholder scan:** код приведён полностью в каждом шаге; нет TODO/«обработать ошибки»/«аналогично Task N».

**3. Type consistency:**
- `CellPosition` определён в `cellHighlight.ts` (Task 1), потребляется в Board/GameScreen — согласовано.
- `CellHighlight` — из `cellHighlight.ts`, потребляется Cell (Task 4) — согласовано.
- `computeHighlight` принимает options-объект `{ pos, selected, grid, conflicts }` — вызовы в Board совпадают.
- `GameBoardState`/`GameBoardAction`/`isGiven`/`createInitialState`/`gameBoardReducer` (Task 2) → `useGameBoard` (Task 3) → согласованы.
- `UseGameBoard` API (`placeDigit`/`erase`/`newGame`/`cellIsGiven`/`state`/`conflicts`/`solved`) — потребляется GameScreen (Task 7): совпадает.
- `BoardProps`/`NumberPadProps`/`CellProps` — вызовы в GameScreen/Board совпадают по именам и типам.
- Core-сигнатуры (`generatePuzzle` → `{ puzzle, solution }`, `findConflicts` → `boolean[][]`, `isSolved` → `boolean`, `getBoxStart`, `cloneGrid`, `EMPTY_CELL`, `GRID_SIZE`) сверены с реальным кодом `src/core`.

**Примечание об options-объектах (CLAUDE.md):** `placeDigit`/`erase`/`onSelect`/`onSelectCell`/`computeHighlight`/`isPlacementValid`-стиль — все многопараметрические/однотипные вызовы приняты объектом. `isGiven(state, row, col)` и `cellIsGiven(row, col)` оставлены позиционными: типы различимы (`state` vs два `number`), но два подряд `number` — пограничный случай; при исполнении допустимо перевести `cellIsGiven`/`isGiven` на объект `{ row, col }`, если ревьюер сочтёт нужным (не блокер).
