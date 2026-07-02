# Фаза 2: Core-логика (generator / solver / validator) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать чистую, полностью протестированную логику судоку — solver (решаемость + единственность), generator (единственно решаемые головоломки по сложности), validator (конфликты и детект решённости) — как основу игры.

**Architecture:** Всё в `src/core/`, без React и без DOM ([ADR-0003](../../adr/0003-state-architecture.md)). TDD: тест → провал → минимальная реализация → проход. Solver — backtracking с подсчётом до 2 решений для проверки единственности. Generator строит полное решение, затем удаляет клетки, сохраняя единственность.

**Tech Stack:** TypeScript, Vitest.

## Global Constraints

- `core/` без React/DOM. Типы из `src/core/types.ts` (Фаза 1): `Difficulty`, `Grid`, `GRID_SIZE = 9`, `BOX_SIZE = 3`, `EMPTY_CELL = 0`.
- Читаемость по CLAUDE.md: описательные имена, без вложенных тернарников, lookup-структуры вместо switch-цепочек, options-объект при 3+ параметрах.
- Git: ветка `feat/phase-2-core-logic`, коммиты `<type>: <описание> (Phase 2)`.
- Тесты — рядом или в `src/core/__tests__/`, имена `*.test.ts`.

---

### Task 1: Утилиты работы с полем

**Files:**
- Create: `src/core/grid.ts`
- Test: `src/core/__tests__/grid.test.ts`

**Interfaces:**
- Consumes: `Grid`, `GRID_SIZE`, `BOX_SIZE`, `EMPTY_CELL` из `types.ts`.
- Produces:
  - `cloneGrid(grid: Grid): Grid`
  - `getBoxStart(index: number): number` — начало блока 3×3 для строки/столбца.
  - `findEmptyCell(grid: Grid): { row: number; col: number } | null`
  - `isPlacementValid(args: { grid: Grid; row: number; col: number; value: number }): boolean` — можно ли поставить `value`, не нарушая строку/столбец/блок (без учёта самой клетки).

- [ ] **Step 1: Написать падающие тесты**

`src/core/__tests__/grid.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { cloneGrid, getBoxStart, findEmptyCell, isPlacementValid } from '../grid';
import type { Grid } from '../types';

const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));

describe('cloneGrid', () => {
  it('создаёт глубокую копию', () => {
    const grid = emptyGrid();
    const copy = cloneGrid(grid);
    copy[0][0] = 5;
    expect(grid[0][0]).toBe(0);
  });
});

describe('getBoxStart', () => {
  it('возвращает начало блока 3×3', () => {
    expect(getBoxStart(0)).toBe(0);
    expect(getBoxStart(4)).toBe(3);
    expect(getBoxStart(8)).toBe(6);
  });
});

describe('findEmptyCell', () => {
  it('находит первую пустую клетку', () => {
    const grid = emptyGrid();
    grid[0][0] = 1;
    expect(findEmptyCell(grid)).toEqual({ row: 0, col: 1 });
  });
  it('возвращает null для заполненного поля', () => {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(1));
    expect(findEmptyCell(grid)).toBeNull();
  });
});

describe('isPlacementValid', () => {
  it('отклоняет дубль в строке', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    expect(isPlacementValid({ grid, row: 0, col: 3, value: 5 })).toBe(false);
  });
  it('отклоняет дубль в столбце', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    expect(isPlacementValid({ grid, row: 3, col: 0, value: 5 })).toBe(false);
  });
  it('отклоняет дубль в блоке', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    expect(isPlacementValid({ grid, row: 1, col: 1, value: 5 })).toBe(false);
  });
  it('разрешает валидную постановку', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    expect(isPlacementValid({ grid, row: 0, col: 3, value: 6 })).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- grid`
Expected: FAIL — модуль `../grid` не найден.

- [ ] **Step 3: Реализовать `src/core/grid.ts`**

```ts
import { type Grid, GRID_SIZE, BOX_SIZE, EMPTY_CELL } from './types';

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function getBoxStart(index: number): number {
  return Math.floor(index / BOX_SIZE) * BOX_SIZE;
}

export function findEmptyCell(grid: Grid): { row: number; col: number } | null {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === EMPTY_CELL) return { row, col };
    }
  }
  return null;
}

interface PlacementArgs {
  grid: Grid;
  row: number;
  col: number;
  value: number;
}

export function isPlacementValid({ grid, row, col, value }: PlacementArgs): boolean {
  for (let i = 0; i < GRID_SIZE; i++) {
    if (i !== col && grid[row][i] === value) return false;
    if (i !== row && grid[i][col] === value) return false;
  }
  const boxRow = getBoxStart(row);
  const boxCol = getBoxStart(col);
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if ((r !== row || c !== col) && grid[r][c] === value) return false;
    }
  }
  return true;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- grid`
Expected: PASS (все тесты).

- [ ] **Step 5: Commit**

```bash
git add src/core/grid.ts src/core/__tests__/grid.test.ts
git commit -m "feat: Добавить утилиты работы с полем судоку (Phase 2)"
```

---

### Task 2: Solver — решаемость и подсчёт решений

**Files:**
- Create: `src/core/solver.ts`
- Test: `src/core/__tests__/solver.test.ts`

**Interfaces:**
- Consumes: `cloneGrid`, `findEmptyCell`, `isPlacementValid` из `grid.ts`.
- Produces:
  - `solve(grid: Grid): Grid | null` — первое найденное решение или `null`.
  - `countSolutions(grid: Grid, limit?: number): number` — число решений, поиск останавливается по достижении `limit` (по умолчанию 2, чтобы отличить единственное от множественного).
  - `hasUniqueSolution(grid: Grid): boolean` — `countSolutions(grid, 2) === 1`.

- [ ] **Step 1: Написать падающие тесты**

`src/core/__tests__/solver.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { solve, countSolutions, hasUniqueSolution } from '../solver';
import type { Grid } from '../types';

// Валидная головоломка с единственным решением (known-answer).
const uniquePuzzle: Grid = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));

describe('solve', () => {
  it('решает валидную головоломку', () => {
    const solution = solve(uniquePuzzle);
    expect(solution).not.toBeNull();
    // все клетки заполнены 1..9
    expect(solution!.every((row) => row.every((v) => v >= 1 && v <= 9))).toBe(true);
  });

  it('возвращает null для нерешаемого поля', () => {
    const bad = emptyGrid();
    bad[0][0] = 5;
    bad[0][1] = 5; // конфликт в строке — нерешаемо
    expect(solve(bad)).toBeNull();
  });
});

describe('countSolutions', () => {
  it('единственное решение = 1', () => {
    expect(countSolutions(uniquePuzzle, 2)).toBe(1);
  });
  it('пустое поле имеет более одного решения (стоп на limit)', () => {
    expect(countSolutions(emptyGrid(), 2)).toBe(2);
  });
});

describe('hasUniqueSolution', () => {
  it('true для единственно решаемой', () => {
    expect(hasUniqueSolution(uniquePuzzle)).toBe(true);
  });
  it('false для пустого поля', () => {
    expect(hasUniqueSolution(emptyGrid())).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- solver`
Expected: FAIL — модуль `../solver` не найден.

- [ ] **Step 3: Реализовать `src/core/solver.ts`**

```ts
import { type Grid, GRID_SIZE } from './types';
import { cloneGrid, findEmptyCell, isPlacementValid } from './grid';

export function solve(grid: Grid): Grid | null {
  const working = cloneGrid(grid);
  const solved = fillFrom(working);
  return solved ? working : null;
}

function fillFrom(grid: Grid): boolean {
  const empty = findEmptyCell(grid);
  if (!empty) return true;
  const { row, col } = empty;
  for (let value = 1; value <= GRID_SIZE; value++) {
    if (isPlacementValid({ grid, row, col, value })) {
      grid[row][col] = value;
      if (fillFrom(grid)) return true;
      grid[row][col] = 0;
    }
  }
  return false;
}

export function countSolutions(grid: Grid, limit = 2): number {
  const working = cloneGrid(grid);
  let found = 0;

  const search = (): void => {
    if (found >= limit) return;
    const empty = findEmptyCell(working);
    if (!empty) {
      found++;
      return;
    }
    const { row, col } = empty;
    for (let value = 1; value <= GRID_SIZE; value++) {
      if (found >= limit) return;
      if (isPlacementValid({ grid: working, row, col, value })) {
        working[row][col] = value;
        search();
        working[row][col] = 0;
      }
    }
  };

  search();
  return found;
}

export function hasUniqueSolution(grid: Grid): boolean {
  return countSolutions(grid, 2) === 1;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- solver`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/solver.ts src/core/__tests__/solver.test.ts
git commit -m "feat: Добавить solver с проверкой единственности решения (Phase 2)"
```

---

### Task 3: Validator — конфликты и детект решённости

**Files:**
- Create: `src/core/validator.ts`
- Test: `src/core/__tests__/validator.test.ts`

**Interfaces:**
- Consumes: `Grid`, `GRID_SIZE`, `EMPTY_CELL`, `getBoxStart`.
- Produces:
  - `findConflicts(grid: Grid): boolean[][]` — матрица 9×9, `true` в клетках, чьё ненулевое значение дублируется в строке/столбце/блоке. Пустые клетки всегда `false`.
  - `isSolved(grid: Grid): boolean` — поле заполнено и без конфликтов.

- [ ] **Step 1: Написать падающие тесты**

`src/core/__tests__/validator.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { findConflicts, isSolved } from '../validator';
import type { Grid } from '../types';

const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));

const solvedGrid: Grid = [
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

describe('findConflicts', () => {
  it('нет конфликтов на решённом поле', () => {
    const conflicts = findConflicts(solvedGrid);
    expect(conflicts.flat().some(Boolean)).toBe(false);
  });
  it('ловит дубль в строке', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    grid[0][4] = 5;
    const conflicts = findConflicts(grid);
    expect(conflicts[0][0]).toBe(true);
    expect(conflicts[0][4]).toBe(true);
    expect(conflicts[0][1]).toBe(false);
  });
  it('ловит дубль в столбце', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    grid[4][0] = 5;
    const conflicts = findConflicts(grid);
    expect(conflicts[0][0]).toBe(true);
    expect(conflicts[4][0]).toBe(true);
  });
  it('ловит дубль в блоке', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    grid[1][1] = 5;
    const conflicts = findConflicts(grid);
    expect(conflicts[0][0]).toBe(true);
    expect(conflicts[1][1]).toBe(true);
  });
  it('пустые клетки не конфликтуют', () => {
    const conflicts = findConflicts(emptyGrid());
    expect(conflicts.flat().some(Boolean)).toBe(false);
  });
});

describe('isSolved', () => {
  it('true для решённого поля', () => {
    expect(isSolved(solvedGrid)).toBe(true);
  });
  it('false для пустого', () => {
    expect(isSolved(emptyGrid())).toBe(false);
  });
  it('false при конфликте', () => {
    const grid = solvedGrid.map((row) => [...row]);
    grid[0][0] = grid[0][1]; // создаём дубль
    expect(isSolved(grid)).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- validator`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/core/validator.ts`**

```ts
import { type Grid, GRID_SIZE, EMPTY_CELL } from './types';
import { getBoxStart } from './grid';

export function findConflicts(grid: Grid): boolean[][] {
  const conflicts: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(false),
  );

  const markDuplicates = (cells: Array<{ row: number; col: number }>): void => {
    const seen = new Map<number, Array<{ row: number; col: number }>>();
    for (const cell of cells) {
      const value = grid[cell.row][cell.col];
      if (value === EMPTY_CELL) continue;
      const group = seen.get(value) ?? [];
      group.push(cell);
      seen.set(value, group);
    }
    for (const group of seen.values()) {
      if (group.length > 1) {
        for (const cell of group) conflicts[cell.row][cell.col] = true;
      }
    }
  };

  for (let i = 0; i < GRID_SIZE; i++) {
    const rowCells = Array.from({ length: GRID_SIZE }, (_, col) => ({ row: i, col }));
    const colCells = Array.from({ length: GRID_SIZE }, (_, row) => ({ row, col: i }));
    markDuplicates(rowCells);
    markDuplicates(colCells);
  }

  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += 3) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += 3) {
      const boxCells: Array<{ row: number; col: number }> = [];
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
          boxCells.push({ row: r, col: c });
        }
      }
      markDuplicates(boxCells);
    }
  }

  return conflicts;
}

export function isSolved(grid: Grid): boolean {
  const isFull = grid.every((row) => row.every((value) => value !== EMPTY_CELL));
  if (!isFull) return false;
  return !findConflicts(grid).flat().some(Boolean);
}
```
(`getBoxStart` импортирован для консистентности с остальным core, но в блочном обходе используются прямые границы — при желании упростить импорт можно убрать, если линт ругается на неиспользуемое.)

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- validator`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/validator.ts src/core/__tests__/validator.test.ts
git commit -m "feat: Добавить validator конфликтов и детект решённости (Phase 2)"
```

---

### Task 4: Генерация полного решённого поля

**Files:**
- Create: `src/core/generator.ts`
- Test: `src/core/__tests__/generator.test.ts`

**Interfaces:**
- Consumes: `Grid`, `GRID_SIZE`, `isPlacementValid`, `findEmptyCell`, `isSolved`.
- Produces: `generateFullGrid(): Grid` — случайное полностью решённое поле 9×9.

- [ ] **Step 1: Написать падающие тесты**

`src/core/__tests__/generator.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateFullGrid } from '../generator';
import { isSolved } from '../validator';

describe('generateFullGrid', () => {
  it('всегда даёт валидное решённое поле (прогон 20 раз)', () => {
    for (let i = 0; i < 20; i++) {
      expect(isSolved(generateFullGrid())).toBe(true);
    }
  });
  it('даёт разные поля (рандомизация)', () => {
    const a = JSON.stringify(generateFullGrid());
    const b = JSON.stringify(generateFullGrid());
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- generator`
Expected: FAIL — `generateFullGrid` не найдена.

- [ ] **Step 3: Реализовать `generateFullGrid` в `src/core/generator.ts`**

```ts
import { type Grid, GRID_SIZE, EMPTY_CELL } from './types';
import { findEmptyCell, isPlacementValid } from './grid';

function shuffled(values: number[]): number[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function fillRandomly(grid: Grid): boolean {
  const empty = findEmptyCell(grid);
  if (!empty) return true;
  const { row, col } = empty;
  for (const value of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (isPlacementValid({ grid, row, col, value })) {
      grid[row][col] = value;
      if (fillRandomly(grid)) return true;
      grid[row][col] = EMPTY_CELL;
    }
  }
  return false;
}

export function generateFullGrid(): Grid {
  const grid: Grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(EMPTY_CELL));
  fillRandomly(grid);
  return grid;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- generator`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/generator.ts src/core/__tests__/generator.test.ts
git commit -m "feat: Добавить генерацию полного решённого поля (Phase 2)"
```

---

### Task 5: Пороги сложности (данные)

**Files:**
- Create: `src/core/difficulty.ts`
- Test: `src/core/__tests__/difficulty.test.ts`

**Interfaces:**
- Consumes: `Difficulty`.
- Produces: `DIFFICULTY_CLUES: Record<Difficulty, { min: number; max: number }>` — целевое число открытых клеток по спеке §5.1 (easy 36–40, medium 30–35, hard 24–28); `targetCluesFor(difficulty: Difficulty): number` — случайное целевое число открытых клеток в диапазоне.

- [ ] **Step 1: Написать падающие тесты**

`src/core/__tests__/difficulty.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DIFFICULTY_CLUES, targetCluesFor } from '../difficulty';

describe('DIFFICULTY_CLUES', () => {
  it('диапазоны соответствуют спеке §5.1', () => {
    expect(DIFFICULTY_CLUES.easy).toEqual({ min: 36, max: 40 });
    expect(DIFFICULTY_CLUES.medium).toEqual({ min: 30, max: 35 });
    expect(DIFFICULTY_CLUES.hard).toEqual({ min: 24, max: 28 });
  });
});

describe('targetCluesFor', () => {
  it('возвращает число в диапазоне сложности', () => {
    for (let i = 0; i < 30; i++) {
      const clues = targetCluesFor('medium');
      expect(clues).toBeGreaterThanOrEqual(30);
      expect(clues).toBeLessThanOrEqual(35);
    }
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- difficulty`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/core/difficulty.ts`**

```ts
import type { Difficulty } from './types';

export const DIFFICULTY_CLUES: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 36, max: 40 },
  medium: { min: 30, max: 35 },
  hard: { min: 24, max: 28 },
};

export function targetCluesFor(difficulty: Difficulty): number {
  const { min, max } = DIFFICULTY_CLUES[difficulty];
  return min + Math.floor(Math.random() * (max - min + 1));
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- difficulty`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/difficulty.ts src/core/__tests__/difficulty.test.ts
git commit -m "feat: Добавить пороги сложности (Phase 2)"
```

---

### Task 6: Генерация головоломки с единственным решением

**Files:**
- Modify: `src/core/generator.ts` (добавить `generatePuzzle`)
- Modify: `src/core/__tests__/generator.test.ts` (добавить тесты)

**Interfaces:**
- Consumes: `generateFullGrid`, `hasUniqueSolution`, `cloneGrid`, `targetCluesFor`, `Difficulty`, `Grid`.
- Produces: `generatePuzzle(difficulty: Difficulty): { puzzle: Grid; solution: Grid }` — головоломка с числом открытых клеток ~ target и гарантированной единственностью решения.

- [ ] **Step 1: Написать падающие тесты (добавить в generator.test.ts)**

```ts
import { generatePuzzle } from '../generator';
import { hasUniqueSolution } from '../solver';
import { DIFFICULTY_CLUES } from '../difficulty';

describe('generatePuzzle', () => {
  it('головоломка единственно решаема (прогон 10 раз, все сложности)', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (let i = 0; i < 10; i++) {
        const { puzzle } = generatePuzzle(difficulty);
        expect(hasUniqueSolution(puzzle)).toBe(true);
      }
    }
  });

  it('solution решает puzzle и полностью заполнено', () => {
    const { puzzle, solution } = generatePuzzle('easy');
    // каждая открытая клетка puzzle совпадает с solution
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) expect(puzzle[r][c]).toBe(solution[r][c]);
      }
    }
    expect(solution.every((row) => row.every((v) => v >= 1 && v <= 9))).toBe(true);
  });

  it('число открытых клеток не ниже минимума сложности', () => {
    const { puzzle } = generatePuzzle('hard');
    const clues = puzzle.flat().filter((v) => v !== 0).length;
    expect(clues).toBeGreaterThanOrEqual(DIFFICULTY_CLUES.hard.min);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- generator`
Expected: FAIL — `generatePuzzle` не найдена.

- [ ] **Step 3: Реализовать `generatePuzzle`**

Добавить в `src/core/generator.ts`:
```ts
import { type Difficulty } from './types';
import { cloneGrid } from './grid';
import { hasUniqueSolution } from './solver';
import { targetCluesFor } from './difficulty';

export function generatePuzzle(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  const solution = generateFullGrid();
  const puzzle = cloneGrid(solution);
  const targetClues = targetCluesFor(difficulty);

  const positions = shuffled(Array.from({ length: 81 }, (_, i) => i));
  let clues = 81;

  for (const pos of positions) {
    if (clues <= targetClues) break;
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    if (puzzle[row][col] === EMPTY_CELL) continue;

    const backup = puzzle[row][col];
    puzzle[row][col] = EMPTY_CELL;

    if (hasUniqueSolution(puzzle)) {
      clues--;
    } else {
      puzzle[row][col] = backup; // откат — удаление ломает единственность
    }
  }

  return { puzzle, solution };
}
```
Примечание: `shuffled` уже определена в этом файле (Task 4). Если целевое число клеток недостижимо без потери единственности, генератор останавливается на достигнутом — это гарантирует корректность в ущерб точному попаданию в диапазон (тест проверяет только нижнюю границу для hard).

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- generator`
Expected: PASS (тесты могут идти несколько секунд из-за прогонов — это нормально).

- [ ] **Step 5: Commit**

```bash
git add src/core/generator.ts src/core/__tests__/generator.test.ts
git commit -m "feat: Добавить генерацию головоломки с единственным решением (Phase 2)"
```

---

### Task 7: Публичный barrel-экспорт core и завершение фазы

**Files:**
- Create: `src/core/index.ts`
- Delete: `src/core/__tests__/smoke.test.ts` (если ещё есть с Фазы 1)
- Modify: `docs/roadmap.md`, `docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md`

**Interfaces:**
- Produces: единая точка импорта `src/core` для слоя `state/`.

- [ ] **Step 1: Создать barrel `src/core/index.ts`**

```ts
export * from './types';
export * from './grid';
export * from './solver';
export * from './validator';
export * from './generator';
export * from './difficulty';
```

- [ ] **Step 2: Удалить smoke-тест Фазы 1 (если существует)**

```bash
rm -f src/core/__tests__/smoke.test.ts
```

- [ ] **Step 3: Прогнать весь набор + type-check + lint**

Run: `npm run type-check && npm run lint && npm test`
Expected: type-check и lint без ошибок; все core-тесты проходят.

- [ ] **Step 4: Обновить трекинг**

В `docs/roadmap.md`: строка «Core-логика» → `✅ готово`, дата, ветка `feat/phase-2-core-logic`. В индексе планов отметить Фазу 2 завершённой.

- [ ] **Step 5: Commit**

```bash
git add src/core/index.ts docs/roadmap.md docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md
git commit -m "feat: Добавить barrel-экспорт core и отметить завершение (Phase 2)"
```

- [ ] **Step 6: Финализация ветки**

Использовать `superpowers:finishing-a-development-branch`.

---

## Self-Review

- **Spec coverage §5:** §5.1 генерация (полное поле + удаление с проверкой единственности) — Tasks 4, 6. §5.2 solver (решаемость + единственность, быстрая валидация) — Tasks 2, 3. §5.3 тесты (генератор N раз, solver known-answer, валидатор дублей) — покрыты в Tasks 2–4, 6.
- **Placeholder scan:** код приведён полностью в каждом шаге; нет TODO/«обработать ошибки».
- **Type consistency:** `Grid`, `Difficulty`, `GRID_SIZE`, `BOX_SIZE`, `EMPTY_CELL` из `types.ts` (Фаза 1). `isPlacementValid` принимает options-объект (`{grid,row,col,value}`) — согласовано во всех вызовах (grid.ts, solver.ts, generator.ts). `hasUniqueSolution`/`countSolutions`/`solve` — консистентны между solver.ts и generator.ts. `targetCluesFor`/`DIFFICULTY_CLUES` — между difficulty.ts и generator.ts.
- **Пороги сложности** «откалибровать тестами» (роадмап): тесты Task 6 проверяют корректность (единственность) как жёсткий инвариант и нижнюю границу clues; точная калибровка «продвинутых техник» для hard вынесена как возможное уточнение, но не блокирует MVP (нижняя граница clues + единственность достаточны).
