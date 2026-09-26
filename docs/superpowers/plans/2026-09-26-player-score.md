# Очки игрока, уровни и ранги — план реализации

> **Для агентов-исполнителей:** ОБЯЗАТЕЛЬНЫЙ ПОД-СКИЛЛ: superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans — выполнять план задача за задачей. Шаги размечены чекбоксами (`- [ ]`).

**Цель:** очки за каждую верную цифру прямо во время партии, накопление между партиями, уровни и ранги со значками, рекорд очков по сложностям, праздничный экран победы с набегающим счётом и конфетти.

**Архитектура:** вся арифметика вынесена в чистые модули `src/state/scoring.ts` (начисление и штраф) и `src/state/progress.ts` (уровни, ранги, агрегаты журнала). Reducer только применяет результат. Баланс, уровень и ранг не хранятся, а вычисляются из журнала IndexedDB (ADR-0002). Анимация экрана победы описана данными: чистая функция строит таймлайн шагов, а хук `useWinSequence` проигрывает его. Физика конфетти — чистая функция шага, canvas-движок только рисует.

**Стек:** React 18, TypeScript, CSS Modules, Vitest + Testing Library (jsdom), idb. Новых зависимостей нет.

**Спека:** [docs/superpowers/specs/2026-09-26-player-score-design.md](../specs/2026-09-26-player-score-design.md). Исполнитель читает её вместе с планом. Решения спеки не пересматриваются.

## Глобальные ограничения

- Ветка `feat/player-score`. В `main` не коммитить. `git push --force` и `git reset --hard` не использовать.
- Новых npm-зависимостей нет. Это касается и `canvas-confetti`: конфетти делаем своим движком на canvas.
- Playwright не ставить: `test:e2e` в проекте нет. Проверяем через Vitest (unit и компоненты) и ручной прогон в браузере.
- Перед тяжёлыми проверками (установка инструментов, временные verify-скрипты) спросить пользователя.
- `GAME_SCHEMA_VERSION` и `DB_VERSION` **не меняются**. Новые поля `GameState` заполняются мягкой миграцией (ADR-0007).
- Правила `CLAUDE.md`:
  - вложенные тернарники запрещены;
  - при 3+ параметрах, а также при 2 параметрах одного типа или с `boolean` — функция принимает options-object;
  - вместо цепочек `if`/`switch` — lookup-таблицы;
  - имена полные, без сокращений;
  - у каждого нового интерактивного или проверяемого элемента есть `data-testid`.
- Коммиты:
  - формат `<type>: <описание>`, описание в русском повелительном наклонении;
  - в конце сообщения строка `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - перед коммитом `git status`, файлы добавлять поимённо, `git add -A` не использовать.
- Константы начисления (спека §2.1):

  | Сложность | base | step | min |
  |---|---|---|---|
  | easy | 50 | 5 | 5 |
  | medium | 150 | 15 | 15 |
  | hard | 210 | 21 | 21 |

  Окно убывания — 5 с.
- Уровень `L` начинается с `5000 × (L−1) × L / 2` очков.
- Ранги (с какого уровня, цвет):

  | Ранг | С уровня | Цвет |
  |---|---|---|
  | Новичок | 1 | `#37b26b` |
  | Ученик | 3 | `#3f9fd8` |
  | Любитель | 5 | `#2f6fed` |
  | Знаток | 8 | `#7b5cf0` |
  | Эксперт | 12 | `#12a4b6` |
  | Мастер | 17 | `#e8a23a` |
  | Гроссмейстер | 25 | `#d49a12` |
- `data-testid` из спеки §5.6:
  - `game-score`, `score-popup`;
  - `win-score`, `win-score-burned`, `score-record-badge`;
  - `level-progress`, `level-number`, `rank-name`, `rank-badge`, `new-rank`;
  - `home-profile`, `stats-progress`, `stat-diff-<difficulty>-best-score`.
- Версия в конце ветки — `0.2.0` (minor), отдельным коммитом `chore: версия 0.2.0`.

## Уточнения поверх спеки (вынесены на ревью)

1. **`ScoreEvent.closedUnits: ClosedUnits`** — поле добавлено к модели из спеки §3.1.
   - Зачем: спека §5.2 требует подсвечивать закрытые линии и квадрат, но в `ScoreEvent` нет данных о том, *что именно* закрылось.
   - Альтернатива — считать это в UI повторно, но тогда появляется второй источник истины.
2. **Штраф при счёте 0 не создаёт `lastScoreEvent`**.
   - Фактический `delta = 0`, всплывашки «−0» и покачивания нет. Жизнь при этом снимается как обычно.
3. **Рекорд очков — `null`, если на сложности нет побед со `score > 0`**.
   - Касается старых побед без поля `score`: для них в статистике показывается `—`, а не «★ 0 очков».
   - Первая победа с очками считается рекордом.
4. **«Диалог сброса статистики»**. Сейчас это не диалог, а кнопка без подтверждения.
   - План: добавить под кнопкой подпись `data-testid="reset-stats-hint"` с текстом «Вместе со статистикой сбросятся очки, уровень и ранг».
   - Поведение кнопки не меняется: подтверждение не добавляем, существующий тест остаётся зелёным.
5. **Карточка прогресса на экране статистики считает баланс из журнала, который `StatsView` уже загружает сам** (`totalScore(games)`), а не через `RecordsContext`.
   - Иначе `StatsView` и его тесты пришлось бы оборачивать в `RecordsProvider`.
   - Результат тот же: источник — один журнал.
6. **`useCountUp` и `usePrefersReducedMotion` перенесены в задачу 5** (в разбивке пользователя они были в задаче 6): их использует уже `ScoreDisplay`.
   - Строка роадмапа (`🚧`) заводится в задаче 2 вместе с ADR-0007, по правилу `CLAUDE.md` «начало работы → 🚧».
   - В задаче 7 строка переводится в `✅`.
7. **`WinScreen` получает новый проп `scoreSummary` как необязательный**. Без него блоков очков и прогресса нет.
   - Так существующие `WinScreen.test.tsx` остаются зелёными без правок.
   - `GameScreen` передаёт проп всегда.

## На что смотреть при ревью

Спека эти случаи подразумевает, но отдельной строкой не описывает. Тест на каждый добавлен в задачу-владельца:

1. **Сохранённая партия, начатая до обновления, восстанавливается посреди игры.**
   - Уже верные клетки повторно очков не платят.
   - Первая новая цифра не получает огромный `dt`: `lastCorrectAtSecond = elapsedSeconds`.
   - Тесты — задача 2, `localGame.test.ts`.
2. **Стереть верную цифру и поставить заново** (ERASE разрешён для верных цифр).
   - Результат: 0 очков, без всплывашки, `lastCorrectAtSecond` не меняется.
   - Тест — задача 2, `gameReducer.test.ts`.
3. **Ошибка при счёте 0 или меньше базы.**
   - Счёт не уходит в минус, штраф фактический.
   - Тест — задача 2.
4. **Журнал ещё не загрузился или запись в него не удалась.**
   - Экран победы всё равно считает «после» как `prevTotal + score` локально.
   - Тест — задача 3, `completionSummary.test.ts`.
5. **Старые записи журнала без `score`.**
   - В баланс они идут как 0, рекорд очков на их основе — `—`.
   - Тесты — задача 1 (`progress.test.ts`) и задача 4 (статистика).

Дополнительно проверяется: после перезагрузки страницы всплывашка не проигрывается повторно (`RESTORE` и `loadGame` обнуляют `lastScoreEvent`), а `dt` не бывает отрицательным (защита в `cellPoints`).

---

## Карта файлов

| Файл | Действие | Ответственность |
|---|---|---|
| `src/state/scoring.ts` (+ `.test.ts`) | создать | `SCORE_RULES`, `cellPoints`, `closedUnitsAt`, `completedUnitsMultiplier`, `scoreCorrectEntry`, `mistakePenalty` |
| `src/state/progress.ts` (+ `.test.ts`) | создать | уровни, `RANKS`, `rankForLevel`, `rankById`, `nextRankAfter`, `levelUpSegments`, `totalScore`, `bestScoresByDifficulty` |
| `src/state/gameTypes.ts` | изменить | `ScoreEvent`, `ScoreFields`, новые поля `GameState` |
| `src/state/gameReducer.ts` (+ тест) | изменить | начисление/штраф в `placeDigit`, `createInitialScoreFields`, `RESTORE` чистит событие |
| `src/state/storage/localGame.ts` (+ тест) | изменить | `withScoreDefaults` — мягкая миграция |
| `docs/adr/0007-soft-gamestate-migration.md`, `docs/adr/README.md` | создать/изменить | ADR-0007 |
| `src/state/storage/historyDb.ts` | изменить | `CompletedGame.score?` |
| `src/state/completionSummary.ts` (+ тест) | создать | чистый расчёт итогов завершения (рекорды, prev/next баланс) |
| `src/state/RecordsContext.tsx` (+ тест) | изменить | `bestScores`, `totalScore` |
| `src/state/GameContext.tsx` (+ тест) | изменить | запись `score`, снимок «до», `GameApi.completion` |
| `src/components/rank/formatPoints.ts` (+ тест) | создать | `formatPoints`, `pointsWord` |
| `src/components/rank/progressCaptions.ts` (+ тест) | создать | подписи под полоской для главного и статистики |
| `src/components/rank/rankGlyphs.tsx` | создать | SVG-глифы рангов (данные) |
| `src/components/rank/RankBadge.tsx` + `.module.css` | создать | значок ранга |
| `src/components/rank/LevelProgress.tsx` + `.module.css` (+ тест) | создать | уровень + ранг + полоска |
| `src/components/home/HomeScreen.tsx` + css + тест | изменить | карточка профиля |
| `src/components/stats/StatsView.tsx` + css + тест | изменить | карточка прогресса, рекорд очков в строках |
| `src/components/settings/SettingsScreen.tsx` + css + тест | изменить | подпись о сбросе очков |
| `src/hooks/usePrefersReducedMotion.ts` (+ тест) | создать | чтение `prefers-reduced-motion` |
| `src/hooks/useCountUp.ts` (+ тест) | создать | набегание числа на rAF |
| `src/theme/tokens.css` | изменить | `--score-gain`, `--score-combo`, `--score-loss` |
| `src/components/header/ScoreDisplay.tsx` + `.module.css` | создать | счёт в шапке |
| `src/components/header/Header.tsx` + тест | изменить | вставить `ScoreDisplay` |
| `src/components/board/ScorePopup.tsx`, `ClosedUnitsFlash.tsx`, `ScorePopup.module.css` (+ тест) | создать | всплывашка и подсветка закрытых юнитов |
| `src/components/board/Board.tsx` + css + тест | изменить | проп `scoreEvent` |
| `src/components/game/GameScreen.tsx` | изменить | прокинуть `scoreEvent`, `scoreSummary` |
| `src/components/confetti/confettiPhysics.ts` (+ тест) | создать | чистая физика и залпы |
| `src/components/confetti/useConfetti.ts`, `ConfettiCanvas.module.css` | создать | canvas-движок |
| `src/components/winscreen/winSequence.ts` (+ тест) | создать | таймлайн шагов (данные) |
| `src/components/winscreen/useWinSequence.ts` | создать | проигрывание таймлайна, skip, reduced-motion |
| `src/components/winscreen/WinScore.tsx`, `WinProgress.tsx` | создать | блоки экрана победы |
| `src/components/winscreen/WinScreen.tsx` + css + тест | изменить | сборка экрана победы |
| `docs/roadmap.md`, `package.json`, `CHANGELOG.md` | изменить | трекинг и версия |

---

### Задача 1: `scoring.ts` и `progress.ts` — чистые функции

**Файлы:**
- Создать: `src/state/scoring.ts`, `src/state/scoring.test.ts`
- Создать: `src/state/progress.ts`, `src/state/progress.test.ts`
- Изменить: `src/state/storage/historyDb.ts:6-12` — `CompletedGame.score?` (нужен типам `progress.ts`)

**Интерфейсы:**
- Использует: `Difficulty`, `Grid`, `GRID_SIZE`, `BOX_SIZE`, `getBoxStart` из `src/core`; `CompletedGame` из `historyDb.ts`.
- Отдаёт:
  - `SCORE_RULES: Record<Difficulty, ScoreRule>`
  - `interface ClosedUnits { row: boolean; col: boolean; box: boolean }`, `NO_CLOSED_UNITS`
  - `cellPoints({ difficulty, secondsSinceLastCorrect }): number`
  - `closedUnitsAt({ grid, solution, row, col }): ClosedUnits`
  - `completedUnitsMultiplier(closedUnits: ClosedUnits): number`
  - `scoreCorrectEntry({ difficulty, secondsSinceLastCorrect, closedUnits }): { multiplier: number; gained: number }`
  - `mistakePenalty({ difficulty, score }): { score: number; delta: number }` (`delta ≤ 0`)
  - `levelStart(level): number`, `levelForTotal(total): number`
  - `levelInfo(total): { level; pointsIntoLevel; pointsForLevel; pointsToNext }`
  - `type RankId`, `interface Rank { id; name; fromLevel; color }`, `RANKS`
  - `rankForLevel(level): Rank`, `rankById(id): Rank`, `nextRankAfter(level): Rank | null`
  - `interface LevelSegment { level; fromFraction; toFraction; completesLevel }`
  - `levelUpSegments({ fromTotal, toTotal }): LevelSegment[]`
  - `gameScore(game): number`, `totalScore(games): number`
  - `type ScoreRecordsByDifficulty = Record<Difficulty, number | null>`
  - `bestScoresByDifficulty(games): ScoreRecordsByDifficulty`

- [ ] **Шаг 1: Добавить `score?` в `CompletedGame`**

В `src/state/storage/historyDb.ts` интерфейс принимает вид:

```ts
export interface CompletedGame {
  id: string;
  difficulty: Difficulty;
  durationSeconds: number;
  completedAt: string; // ISO
  outcome: GameOutcome;
  /** Очки партии; для lost/abandoned — 0. Старые записи без поля считаются 0. */
  score?: number;
}
```

- [ ] **Шаг 2: Написать падающие тесты `scoring.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { Grid } from '../core';
import {
  SCORE_RULES,
  NO_CLOSED_UNITS,
  cellPoints,
  closedUnitsAt,
  completedUnitsMultiplier,
  scoreCorrectEntry,
  mistakePenalty,
} from './scoring';

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

function gridWith(changes: Array<{ row: number; col: number; value: number }>): Grid {
  const grid = solved.map((rowValues) => [...rowValues]);
  for (const change of changes) grid[change.row][change.col] = change.value;
  return grid;
}

describe('SCORE_RULES', () => {
  it('шаг и минимум равны base / 10', () => {
    for (const rule of Object.values(SCORE_RULES)) {
      expect(rule.step).toBe(rule.base / 10);
      expect(rule.min).toBe(rule.base / 10);
    }
  });
});

describe('cellPoints', () => {
  it.each([
    { difficulty: 'easy', seconds: 0, expected: 50 },
    { difficulty: 'medium', seconds: 0, expected: 150 },
    { difficulty: 'hard', seconds: 0, expected: 210 },
  ] as const)('база $difficulty = $expected', ({ difficulty, seconds, expected }) => {
    expect(cellPoints({ difficulty, secondsSinceLastCorrect: seconds })).toBe(expected);
  });

  it.each([
    { seconds: 4, expected: 150 },
    { seconds: 5, expected: 135 },
    { seconds: 44, expected: 30 },
    { seconds: 45, expected: 15 },
    { seconds: 200, expected: 15 },
  ])('medium: убывание на границе $seconds с → $expected', ({ seconds, expected }) => {
    expect(cellPoints({ difficulty: 'medium', secondsSinceLastCorrect: seconds })).toBe(expected);
  });

  it('не опускается ниже минимума на easy и hard', () => {
    expect(cellPoints({ difficulty: 'easy', secondsSinceLastCorrect: 1000 })).toBe(5);
    expect(cellPoints({ difficulty: 'hard', secondsSinceLastCorrect: 1000 })).toBe(21);
  });

  it('отрицательный интервал считается нулевым (не даёт больше базы)', () => {
    expect(cellPoints({ difficulty: 'easy', secondsSinceLastCorrect: -7 })).toBe(50);
  });
});

describe('closedUnitsAt', () => {
  it('полностью решённая сетка: строка, столбец и квадрат закрыты', () => {
    expect(closedUnitsAt({ grid: solved, solution: solved, row: 4, col: 4 })).toEqual({
      row: true,
      col: true,
      box: true,
    });
  });

  it('пустая клетка в строке не даёт закрыть строку', () => {
    const grid = gridWith([{ row: 0, col: 8, value: 0 }]);
    const closed = closedUnitsAt({ grid, solution: solved, row: 0, col: 0 });
    expect(closed).toEqual({ row: false, col: true, box: true });
  });

  it('ошибочная цифра линию не закрывает', () => {
    // (8,0) должна быть 3, стоит 9 — столбец 0 заполнен, но не закрыт.
    const grid = gridWith([{ row: 8, col: 0, value: 9 }]);
    const closed = closedUnitsAt({ grid, solution: solved, row: 0, col: 0 });
    expect(closed.col).toBe(false);
  });

  it('квадрат считается по блоку 3×3 клетки', () => {
    const grid = gridWith([{ row: 5, col: 5, value: 0 }]);
    expect(closedUnitsAt({ grid, solution: solved, row: 3, col: 3 }).box).toBe(false);
    expect(closedUnitsAt({ grid, solution: solved, row: 0, col: 0 }).box).toBe(true);
  });
});

describe('completedUnitsMultiplier', () => {
  it.each([
    { closed: NO_CLOSED_UNITS, expected: 1 },
    { closed: { row: true, col: false, box: false }, expected: 5 },
    { closed: { row: true, col: true, box: false }, expected: 10 },
    { closed: { row: true, col: true, box: true }, expected: 15 },
  ])('×$expected', ({ closed, expected }) => {
    expect(completedUnitsMultiplier(closed)).toBe(expected);
  });
});

describe('scoreCorrectEntry', () => {
  it('умножает стоимость клетки на множитель', () => {
    const entry = scoreCorrectEntry({
      difficulty: 'medium',
      secondsSinceLastCorrect: 5,
      closedUnits: { row: true, col: false, box: false },
    });
    expect(entry).toEqual({ multiplier: 5, gained: 675 });
  });
});

describe('mistakePenalty', () => {
  it('снимает base', () => {
    expect(mistakePenalty({ difficulty: 'medium', score: 400 })).toEqual({ score: 250, delta: -150 });
  });

  it('пол 0: фактический штраф меньше базы', () => {
    expect(mistakePenalty({ difficulty: 'medium', score: 100 })).toEqual({ score: 0, delta: -100 });
  });

  it('при нулевом счёте штраф 0', () => {
    expect(mistakePenalty({ difficulty: 'hard', score: 0 })).toEqual({ score: 0, delta: 0 });
  });
});
```

- [ ] **Шаг 3: Запустить — убедиться, что падает**

Run: `npx vitest run src/state/scoring.test.ts`
Expected: FAIL — `Failed to resolve import "./scoring"`.

- [ ] **Шаг 4: Реализовать `src/state/scoring.ts`**

```ts
import { BOX_SIZE, GRID_SIZE, getBoxStart, type Difficulty, type Grid } from '../core';

export interface ScoreRule {
  base: number;
  step: number;
  min: number;
}

/** Правила начисления по сложности (спека §2.1): шаг и минимум = base / 10. */
export const SCORE_RULES: Record<Difficulty, ScoreRule> = {
  easy: { base: 50, step: 5, min: 5 },
  medium: { base: 150, step: 15, min: 15 },
  hard: { base: 210, step: 21, min: 21 },
};

/** Каждые столько секунд с прошлой оплаченной цифры стоимость клетки падает на step. */
export const DECAY_WINDOW_SECONDS = 5;

/** Надбавка к множителю за каждую закрытую строку/столбец/квадрат. */
const MULTIPLIER_PER_CLOSED_UNIT = 5;

export interface ClosedUnits {
  row: boolean;
  col: boolean;
  box: boolean;
}

export const NO_CLOSED_UNITS: ClosedUnits = { row: false, col: false, box: false };

interface CellPosition {
  row: number;
  col: number;
}

const UNIT_INDICES = Array.from({ length: GRID_SIZE }, (_, index) => index);

function rowCells(row: number): CellPosition[] {
  return UNIT_INDICES.map((col) => ({ row, col }));
}

function colCells(col: number): CellPosition[] {
  return UNIT_INDICES.map((row) => ({ row, col }));
}

function boxCells({ row, col }: CellPosition): CellPosition[] {
  const top = getBoxStart(row);
  const left = getBoxStart(col);
  return UNIT_INDICES.map((index) => ({
    row: top + Math.floor(index / BOX_SIZE),
    col: left + (index % BOX_SIZE),
  }));
}

interface UnitCheckArgs {
  cells: CellPosition[];
  grid: Grid;
  solution: Grid;
}

/** Юнит закрыт, когда все его клетки совпадают с решением (ошибочная цифра не закрывает). */
function allMatchSolution({ cells, grid, solution }: UnitCheckArgs): boolean {
  return cells.every((cell) => grid[cell.row][cell.col] === solution[cell.row][cell.col]);
}

interface CellPointsArgs {
  difficulty: Difficulty;
  secondsSinceLastCorrect: number;
}

/** Стоимость одной верной клетки: база минус шаг за каждое полное окно, но не ниже минимума. */
export function cellPoints({ difficulty, secondsSinceLastCorrect }: CellPointsArgs): number {
  const rule = SCORE_RULES[difficulty];
  const safeSeconds = Math.max(0, secondsSinceLastCorrect);
  const elapsedWindows = Math.floor(safeSeconds / DECAY_WINDOW_SECONDS);
  return Math.max(rule.min, rule.base - rule.step * elapsedWindows);
}

interface ClosedUnitsArgs {
  grid: Grid;
  solution: Grid;
  row: number;
  col: number;
}

/** Какие юниты клетки (row,col) закрыты в `grid` — сетке уже ПОСЛЕ постановки цифры. */
export function closedUnitsAt({ grid, solution, row, col }: ClosedUnitsArgs): ClosedUnits {
  return {
    row: allMatchSolution({ cells: rowCells(row), grid, solution }),
    col: allMatchSolution({ cells: colCells(col), grid, solution }),
    box: allMatchSolution({ cells: boxCells({ row, col }), grid, solution }),
  };
}

/** ×1 без закрытых юнитов, иначе по ×5 за каждый закрытый юнит. */
export function completedUnitsMultiplier(closedUnits: ClosedUnits): number {
  const closedCount = Object.values(closedUnits).filter(Boolean).length;
  return Math.max(1, MULTIPLIER_PER_CLOSED_UNIT * closedCount);
}

interface CorrectEntryArgs extends CellPointsArgs {
  closedUnits: ClosedUnits;
}

export interface CorrectEntryScore {
  multiplier: number;
  gained: number;
}

export function scoreCorrectEntry({
  difficulty,
  secondsSinceLastCorrect,
  closedUnits,
}: CorrectEntryArgs): CorrectEntryScore {
  const multiplier = completedUnitsMultiplier(closedUnits);
  const points = cellPoints({ difficulty, secondsSinceLastCorrect });
  return { multiplier, gained: multiplier * points };
}

interface MistakePenaltyArgs {
  difficulty: Difficulty;
  score: number;
}

export interface MistakePenaltyResult {
  score: number;
  /** Фактическое изменение счёта: ≤ 0, с учётом пола 0. */
  delta: number;
}

export function mistakePenalty({ difficulty, score }: MistakePenaltyArgs): MistakePenaltyResult {
  const nextScore = Math.max(0, score - SCORE_RULES[difficulty].base);
  return { score: nextScore, delta: nextScore - score };
}
```

- [ ] **Шаг 5: Запустить — тесты зелёные**

Run: `npx vitest run src/state/scoring.test.ts`
Expected: PASS (все тесты).

- [ ] **Шаг 6: Написать падающие тесты `progress.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { CompletedGame } from './storage/historyDb';
import {
  RANKS,
  levelStart,
  levelForTotal,
  levelInfo,
  rankForLevel,
  rankById,
  nextRankAfter,
  levelUpSegments,
  totalScore,
  bestScoresByDifficulty,
} from './progress';

function game(overrides: Partial<CompletedGame>): CompletedGame {
  return {
    id: crypto.randomUUID(),
    difficulty: 'easy',
    durationSeconds: 100,
    completedAt: '2026-09-26T00:00:00.000Z',
    outcome: 'won',
    ...overrides,
  };
}

describe('levelStart', () => {
  it.each([
    { level: 1, expected: 0 },
    { level: 2, expected: 5000 },
    { level: 3, expected: 15000 },
    { level: 4, expected: 30000 },
    { level: 5, expected: 50000 },
    { level: 6, expected: 75000 },
    { level: 10, expected: 225000 },
  ])('уровень $level начинается с $expected', ({ level, expected }) => {
    expect(levelStart(level)).toBe(expected);
  });
});

describe('levelForTotal', () => {
  it.each([
    { total: 0, expected: 1 },
    { total: 4999, expected: 1 },
    { total: 5000, expected: 2 },
    { total: 14999, expected: 2 },
    { total: 15000, expected: 3 },
    { total: 225000, expected: 10 },
  ])('$total очков → уровень $expected', ({ total, expected }) => {
    expect(levelForTotal(total)).toBe(expected);
  });
});

describe('levelInfo', () => {
  it('прогресс внутри уровня 6 при 89 810 очках', () => {
    expect(levelInfo(89810)).toEqual({
      level: 6,
      pointsIntoLevel: 14810,
      pointsForLevel: 30000,
      pointsToNext: 15190,
    });
  });
});

describe('rankForLevel', () => {
  it.each([
    { level: 1, rank: 'Новичок' },
    { level: 2, rank: 'Новичок' },
    { level: 3, rank: 'Ученик' },
    { level: 4, rank: 'Ученик' },
    { level: 5, rank: 'Любитель' },
    { level: 7, rank: 'Любитель' },
    { level: 8, rank: 'Знаток' },
    { level: 11, rank: 'Знаток' },
    { level: 12, rank: 'Эксперт' },
    { level: 16, rank: 'Эксперт' },
    { level: 17, rank: 'Мастер' },
    { level: 24, rank: 'Мастер' },
    { level: 25, rank: 'Гроссмейстер' },
    { level: 100, rank: 'Гроссмейстер' },
  ])('уровень $level → $rank', ({ level, rank }) => {
    expect(rankForLevel(level).name).toBe(rank);
  });

  it('RANKS отсортирован по fromLevel', () => {
    const levels = RANKS.map((rank) => rank.fromLevel);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });
});

describe('rankById / nextRankAfter', () => {
  it('rankById находит ранг по id', () => {
    expect(rankById('amateur').name).toBe('Любитель');
  });

  it('следующий ранг после уровня 6 — Знаток на ур. 8', () => {
    expect(nextRankAfter(6)).toMatchObject({ name: 'Знаток', fromLevel: 8 });
  });

  it('на последнем ранге следующего нет', () => {
    expect(nextRankAfter(30)).toBeNull();
  });
});

describe('levelUpSegments', () => {
  it('без перехода — один сегмент внутри уровня', () => {
    expect(levelUpSegments({ fromTotal: 1000, toTotal: 3000 })).toEqual([
      { level: 1, fromFraction: 0.2, toFraction: 0.6, completesLevel: false },
    ]);
  });

  it('один переход — сегмент до 100% и остаток на новом уровне', () => {
    expect(levelUpSegments({ fromTotal: 4000, toTotal: 6000 })).toEqual([
      { level: 1, fromFraction: 0.8, toFraction: 1, completesLevel: true },
      { level: 2, fromFraction: 0, toFraction: 0.1, completesLevel: false },
    ]);
  });

  it('два перехода подряд', () => {
    const segments = levelUpSegments({ fromTotal: 4000, toTotal: 16500 });
    expect(segments.map((segment) => segment.level)).toEqual([1, 2, 3]);
    expect(segments.map((segment) => segment.completesLevel)).toEqual([true, true, false]);
    expect(segments[2].toFraction).toBeCloseTo(0.1);
  });

  it('ровно на границе уровня — переход и пустой сегмент нового уровня', () => {
    expect(levelUpSegments({ fromTotal: 4000, toTotal: 5000 })).toEqual([
      { level: 1, fromFraction: 0.8, toFraction: 1, completesLevel: true },
      { level: 2, fromFraction: 0, toFraction: 0, completesLevel: false },
    ]);
  });

  it('без изменения баланса — один неподвижный сегмент', () => {
    expect(levelUpSegments({ fromTotal: 2500, toTotal: 2500 })).toEqual([
      { level: 1, fromFraction: 0.5, toFraction: 0.5, completesLevel: false },
    ]);
  });
});

describe('totalScore', () => {
  it('суммирует очки журнала, записи без score = 0', () => {
    const games = [game({ score: 700 }), game({ outcome: 'lost', score: 0 }), game({})];
    expect(totalScore(games)).toBe(700);
  });

  it('пустой журнал — 0', () => {
    expect(totalScore([])).toBe(0);
  });
});

describe('bestScoresByDifficulty', () => {
  it('максимум среди побед по каждой сложности', () => {
    const games = [
      game({ difficulty: 'easy', score: 500 }),
      game({ difficulty: 'easy', score: 900 }),
      game({ difficulty: 'hard', score: 4000 }),
      game({ difficulty: 'medium', outcome: 'lost', score: 0 }),
    ];
    expect(bestScoresByDifficulty(games)).toEqual({ easy: 900, medium: null, hard: 4000 });
  });

  it('старые победы без score рекорда очков не дают', () => {
    expect(bestScoresByDifficulty([game({ difficulty: 'easy' })])).toEqual({
      easy: null,
      medium: null,
      hard: null,
    });
  });
});
```

- [ ] **Шаг 7: Запустить — убедиться, что падает**

Run: `npx vitest run src/state/progress.test.ts`
Expected: FAIL — `Failed to resolve import "./progress"`.

- [ ] **Шаг 8: Реализовать `src/state/progress.ts`**

```ts
import type { Difficulty } from '../core';
import type { CompletedGame } from './storage/historyDb';

/** На переход L → L+1 нужно LEVEL_STEP_POINTS × L очков. */
export const LEVEL_STEP_POINTS = 5000;

/** Баланс, с которого начинается уровень: 5000 × (L−1) × L / 2. */
export function levelStart(level: number): number {
  return (LEVEL_STEP_POINTS * (level - 1) * level) / 2;
}

export function levelForTotal(total: number): number {
  let level = 1;
  while (levelStart(level + 1) <= total) level += 1;
  return level;
}

export interface LevelInfo {
  level: number;
  pointsIntoLevel: number;
  pointsForLevel: number;
  pointsToNext: number;
}

export function levelInfo(total: number): LevelInfo {
  const level = levelForTotal(total);
  const start = levelStart(level);
  const pointsForLevel = levelStart(level + 1) - start;
  const pointsIntoLevel = total - start;
  return { level, pointsIntoLevel, pointsForLevel, pointsToNext: pointsForLevel - pointsIntoLevel };
}

export type RankId =
  | 'novice'
  | 'apprentice'
  | 'amateur'
  | 'connoisseur'
  | 'expert'
  | 'master'
  | 'grandmaster';

export interface Rank {
  id: RankId;
  name: string;
  fromLevel: number;
  color: string;
}

/** Ранги по возрастанию fromLevel (спека §3.4). */
export const RANKS: readonly Rank[] = [
  { id: 'novice', name: 'Новичок', fromLevel: 1, color: '#37b26b' },
  { id: 'apprentice', name: 'Ученик', fromLevel: 3, color: '#3f9fd8' },
  { id: 'amateur', name: 'Любитель', fromLevel: 5, color: '#2f6fed' },
  { id: 'connoisseur', name: 'Знаток', fromLevel: 8, color: '#7b5cf0' },
  { id: 'expert', name: 'Эксперт', fromLevel: 12, color: '#12a4b6' },
  { id: 'master', name: 'Мастер', fromLevel: 17, color: '#e8a23a' },
  { id: 'grandmaster', name: 'Гроссмейстер', fromLevel: 25, color: '#d49a12' },
];

/** Последний ранг, чей fromLevel уже достигнут. */
export function rankForLevel(level: number): Rank {
  const reached = RANKS.filter((rank) => rank.fromLevel <= level);
  return reached.at(-1) ?? RANKS[0];
}

export function rankById(id: RankId): Rank {
  return RANKS.find((rank) => rank.id === id) ?? RANKS[0];
}

export function nextRankAfter(level: number): Rank | null {
  return RANKS.find((rank) => rank.fromLevel > level) ?? null;
}

export interface LevelSegment {
  level: number;
  fromFraction: number;
  toFraction: number;
  /** Сегмент доводит полоску до 100% — дальше идёт переход на следующий уровень. */
  completesLevel: boolean;
}

interface LevelUpSegmentsArgs {
  fromTotal: number;
  toTotal: number;
}

/** Сегменты анимации полоски уровня при росте баланса fromTotal → toTotal. */
export function levelUpSegments({ fromTotal, toTotal }: LevelUpSegmentsArgs): LevelSegment[] {
  const target = Math.max(fromTotal, toTotal);
  const segments: LevelSegment[] = [];
  let current = fromTotal;
  for (;;) {
    const level = levelForTotal(current);
    const start = levelStart(level);
    const end = levelStart(level + 1);
    const span = end - start;
    const fromFraction = (current - start) / span;
    if (target < end) {
      segments.push({ level, fromFraction, toFraction: (target - start) / span, completesLevel: false });
      return segments;
    }
    segments.push({ level, fromFraction, toFraction: 1, completesLevel: true });
    current = end;
  }
}

/** Очки одной записи журнала; старые записи без поля — 0. */
export function gameScore(game: CompletedGame): number {
  return game.score ?? 0;
}

/** Баланс игрока: сумма очков по всему журналу. */
export function totalScore(games: CompletedGame[]): number {
  return games.reduce((sum, game) => sum + gameScore(game), 0);
}

export type ScoreRecordsByDifficulty = Record<Difficulty, number | null>;

/** Рекорд очков по сложности среди побед; null — побед с очками нет. */
export function bestScoresByDifficulty(games: CompletedGame[]): ScoreRecordsByDifficulty {
  const best: ScoreRecordsByDifficulty = { easy: null, medium: null, hard: null };
  for (const game of games) {
    if (game.outcome !== 'won') continue;
    const score = gameScore(game);
    if (score <= 0) continue;
    const current = best[game.difficulty];
    if (current === null || score > current) best[game.difficulty] = score;
  }
  return best;
}
```

- [ ] **Шаг 9: Запустить тесты и type-check**

Run: `npx vitest run src/state/scoring.test.ts src/state/progress.test.ts && npm run type-check`
Expected: PASS, type-check без ошибок.

- [ ] **Шаг 10: Коммит**

```bash
git status
git add src/state/scoring.ts src/state/scoring.test.ts src/state/progress.ts src/state/progress.test.ts src/state/storage/historyDb.ts
git commit -m "feat: добавить расчёт очков, уровней и рангов

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 2: `GameState` — поля очков, reducer, мягкая миграция, ADR-0007

**Файлы:**
- Изменить: `src/state/gameTypes.ts:28-42`
- Изменить: `src/state/gameReducer.ts` — `createIdleGameState`, `createInitialGameState` (≈105-138), `placeDigit` (199-230), `restore` (278)
- Изменить: `src/state/gameReducer.test.ts` — новые `describe`
- Изменить: `src/state/storage/localGame.ts:22-47`
- Изменить: `src/state/storage/localGame.test.ts` — фикстура `sampleState` и новые тесты
- Создать: `docs/adr/0007-soft-gamestate-migration.md`
- Изменить: `docs/adr/README.md`, `docs/roadmap.md`

**Интерфейсы:**
- Использует (задача 1): `closedUnitsAt`, `scoreCorrectEntry`, `mistakePenalty`, `NO_CLOSED_UNITS`, `ClosedUnits`.
- Отдаёт:
  - `interface ScoreEvent { id; row; col; delta; multiplier; closedUnits: ClosedUnits }`
  - `type ScoreFields = Pick<GameState, 'score' | 'lastCorrectAtSecond' | 'scoredCells' | 'lastScoreEvent'>`
  - `GameState.score / lastCorrectAtSecond / scoredCells / lastScoreEvent`
  - `createInitialScoreFields(): ScoreFields` (экспорт из `gameReducer.ts`)
  - `withScoreDefaults(saved): GameState` (экспорт из `localGame.ts`)

- [ ] **Шаг 1: Расширить типы в `gameTypes.ts`**

Добавить импорт и типы, дополнить `GameState`:

```ts
import type { ClosedUnits } from './scoring';

/** Последнее изменение счёта — для всплывашки над клеткой. Не восстанавливается из хранилища. */
export interface ScoreEvent {
  /** Монотонный счётчик в пределах партии — ключ для перезапуска анимации. */
  id: number;
  row: number;
  col: number;
  /** +начислено или −фактический штраф (с учётом пола 0). */
  delta: number;
  /** 1 для обычной цифры и для ошибки. */
  multiplier: number;
  /** Какие юниты закрыла постановка — для подсветки. */
  closedUnits: ClosedUnits;
}

export interface GameState {
  // ...существующие поля без изменений...
  result?: GameResult;
  /** Счёт текущей партии, ≥ 0. */
  score: number;
  /** elapsedSeconds последней оплаченной верной цифры. */
  lastCorrectAtSecond: number;
  /** 9×9: клетка уже принесла очки (анти-фарм через erase/undo). */
  scoredCells: boolean[][];
  lastScoreEvent: ScoreEvent | null;
}

export type ScoreFields = Pick<
  GameState,
  'score' | 'lastCorrectAtSecond' | 'scoredCells' | 'lastScoreEvent'
>;
```

- [ ] **Шаг 2: Написать падающие тесты reducer'а**

Дописать в конец `src/state/gameReducer.test.ts`. Импорт в шапке дополнить `createInitialScoreFields` из `./gameReducer`.

```ts
// Четыре дыры в левом верхнем квадрате: (0,0)=5, (0,1)=3, (1,0)=6, (1,1)=7.
// Порядок (0,0) → (0,1) → (1,0) → (1,1) даёт множители ×1, ×5, ×5, ×15.
function puzzleWithTopLeftHoles(): Grid {
  const puzzle = solved.map((row) => [...row]);
  puzzle[0][0] = 0;
  puzzle[0][1] = 0;
  puzzle[1][0] = 0;
  puzzle[1][1] = 0;
  return puzzle;
}

function startScoringGame(elapsedSeconds = 0): GameState {
  mockPuzzle(puzzleWithTopLeftHoles());
  return { ...createInitialGameState('easy'), elapsedSeconds };
}

function place(state: GameState, target: { row: number; col: number; value: number }): GameState {
  return gameReducer(state, { type: 'PLACE_DIGIT', ...target });
}

describe('очки — инициализация', () => {
  it('новая партия: счёт 0, клетки не оплачены, события нет', () => {
    const state = createInitialGameState('easy');
    expect(state.score).toBe(0);
    expect(state.lastCorrectAtSecond).toBe(0);
    expect(state.scoredCells.flat().every((scored) => !scored)).toBe(true);
    expect(state.lastScoreEvent).toBeNull();
  });

  it('NEW_GAME обнуляет очки прошлой партии', () => {
    const played = { ...startScoringGame(), score: 999, lastCorrectAtSecond: 40 };
    const next = gameReducer(played, { type: 'NEW_GAME', difficulty: 'easy' });
    expect(next.score).toBe(0);
    expect(next.lastCorrectAtSecond).toBe(0);
    expect(next.lastScoreEvent).toBeNull();
  });

  it('createInitialScoreFields — сетка 9×9 из false', () => {
    const fields = createInitialScoreFields();
    expect(fields.scoredCells).toHaveLength(9);
    expect(fields.scoredCells.every((row) => row.length === 9)).toBe(true);
  });
});

describe('очки — верная цифра', () => {
  it('начисляет стоимость клетки с учётом времени и пишет событие', () => {
    const state = place(startScoringGame(12), { row: 0, col: 0, value: 5 });
    // easy: 50 − 5 × floor(12 / 5) = 40, ×1
    expect(state.score).toBe(40);
    expect(state.lastCorrectAtSecond).toBe(12);
    expect(state.scoredCells[0][0]).toBe(true);
    expect(state.lastScoreEvent).toEqual({
      id: 1,
      row: 0,
      col: 0,
      delta: 40,
      multiplier: 1,
      closedUnits: { row: false, col: false, box: false },
    });
  });

  it('множители ×5 и ×15 за закрытые юниты, id события растёт', () => {
    let state = place(startScoringGame(), { row: 0, col: 0, value: 5 }); // +50
    state = place(state, { row: 0, col: 1, value: 3 }); // строка 0 → ×5 = +250
    expect(state.lastScoreEvent).toMatchObject({ id: 2, multiplier: 5, delta: 250 });
    state = place(state, { row: 1, col: 0, value: 6 }); // столбец 0 → ×5 = +250
    state = place(state, { row: 1, col: 1, value: 7 }); // строка, столбец, квадрат → ×15 = +750
    expect(state.lastScoreEvent).toMatchObject({
      id: 4,
      multiplier: 15,
      delta: 750,
      closedUnits: { row: true, col: true, box: true },
    });
    expect(state.score).toBe(50 + 250 + 250 + 750);
    expect(state.result).toBe('won');
  });

  it('dt считается от последней оплаченной цифры', () => {
    let state = place(startScoringGame(10), { row: 0, col: 0, value: 5 });
    state = { ...state, elapsedSeconds: 16 }; // dt = 6 → 50 − 5 = 45, ×5
    state = place(state, { row: 0, col: 1, value: 3 });
    expect(state.lastScoreEvent?.delta).toBe(225);
  });
});

describe('очки — анти-фарм', () => {
  it('стереть верную цифру и поставить снова — 0 очков, событие и таймер не меняются', () => {
    const scored = place(startScoringGame(5), { row: 0, col: 0, value: 5 });
    const erased = gameReducer({ ...scored, elapsedSeconds: 30 }, { type: 'ERASE', row: 0, col: 0 });
    const replaced = place(erased, { row: 0, col: 0, value: 5 });
    expect(replaced.score).toBe(scored.score);
    expect(replaced.lastCorrectAtSecond).toBe(5);
    expect(replaced.lastScoreEvent).toBe(scored.lastScoreEvent);
  });

  it('undo не возвращает и не отнимает очки; повторная постановка — 0', () => {
    const scored = place(startScoringGame(), { row: 0, col: 0, value: 5 });
    const undone = gameReducer(scored, { type: 'UNDO' });
    expect(undone.score).toBe(scored.score);
    const replaced = place(undone, { row: 0, col: 0, value: 5 });
    expect(replaced.score).toBe(scored.score);
  });
});

describe('очки — ошибка', () => {
  it('штрафует на base и не сбрасывает lastCorrectAtSecond', () => {
    const scored = { ...place(startScoringGame(7), { row: 0, col: 0, value: 5 }), score: 120 };
    const state = place({ ...scored, elapsedSeconds: 20 }, { row: 0, col: 1, value: 9 });
    expect(state.score).toBe(70);
    expect(state.lastCorrectAtSecond).toBe(7);
    expect(state.lastScoreEvent).toMatchObject({ row: 0, col: 1, delta: -50, multiplier: 1 });
  });

  it('счёт не уходит ниже 0: штраф фактический', () => {
    const state = place({ ...startScoringGame(), score: 20 }, { row: 0, col: 0, value: 9 });
    expect(state.score).toBe(0);
    expect(state.lastScoreEvent?.delta).toBe(-20);
  });

  it('при счёте 0 событие не создаётся (штрафовать нечего)', () => {
    const state = place(startScoringGame(), { row: 0, col: 0, value: 9 });
    expect(state.score).toBe(0);
    expect(state.lastScoreEvent).toBeNull();
    expect(state.lives).toBe(INITIAL_LIVES - 1);
  });

  it('повторная ошибка в той же клетке штрафуется снова', () => {
    let state = { ...startScoringGame(), score: 200 };
    state = place(state, { row: 0, col: 0, value: 9 });
    state = place(state, { row: 0, col: 0, value: 8 });
    expect(state.score).toBe(100);
  });

  it('undo ошибки не возвращает очки', () => {
    const penalized = place({ ...startScoringGame(), score: 200 }, { row: 0, col: 0, value: 9 });
    expect(gameReducer(penalized, { type: 'UNDO' }).score).toBe(150);
  });
});

describe('очки — RESTORE', () => {
  it('сбрасывает lastScoreEvent, чтобы всплывашка не проигралась повторно', () => {
    const scored = place(startScoringGame(), { row: 0, col: 0, value: 5 });
    const restored = gameReducer(createIdleGameState('easy'), { type: 'RESTORE', state: scored });
    expect(restored.lastScoreEvent).toBeNull();
    expect(restored.score).toBe(scored.score);
  });
});
```

- [ ] **Шаг 3: Запустить — убедиться, что падает**

Run: `npx vitest run src/state/gameReducer.test.ts`
Expected: FAIL. Новые тесты валятся на `createInitialScoreFields is not a function`, `state.score` — `undefined`. Старые тесты зелёные.

- [ ] **Шаг 4: Реализовать в `gameReducer.ts`**

Импорты дополнить:

```ts
import { closedUnitsAt, mistakePenalty, scoreCorrectEntry, NO_CLOSED_UNITS } from './scoring';
import {
  GAME_SCHEMA_VERSION,
  INITIAL_LIVES,
  type GameState,
  type GameAction,
  type CellNotesSnapshot,
  type Move,
  type ScoreFields,
} from './gameTypes';
```

После `createEmptyGrid` добавить:

```ts
function createEmptyScoredCells(): boolean[][] {
  return Array.from({ length: GRID_SIZE }, () => Array<boolean>(GRID_SIZE).fill(false));
}

/** Поля очков новой партии: счёт 0, отсчёт времени от 0, ни одна клетка не оплачена. */
export function createInitialScoreFields(): ScoreFields {
  return {
    score: 0,
    lastCorrectAtSecond: 0,
    scoredCells: createEmptyScoredCells(),
    lastScoreEvent: null,
  };
}
```

В `createIdleGameState` и `createInitialGameState` добавить `...createInitialScoreFields(),` последней строкой объекта (после `status`).

Перед `placeDigit` добавить хелперы:

```ts
function currentScoreFields(state: GameState): ScoreFields {
  return {
    score: state.score,
    lastCorrectAtSecond: state.lastCorrectAtSecond,
    scoredCells: state.scoredCells,
    lastScoreEvent: state.lastScoreEvent,
  };
}

function nextScoreEventId(state: GameState): number {
  return (state.lastScoreEvent?.id ?? 0) + 1;
}

interface PlacementScoringArgs {
  state: GameState;
  row: number;
  col: number;
}

/** Штраф за ошибку. Нулевой штраф (счёт уже 0) событием не считается — всплывашки нет. */
function scoreAfterMistake({ state, row, col }: PlacementScoringArgs): ScoreFields {
  const penalty = mistakePenalty({ difficulty: state.difficulty, score: state.score });
  if (penalty.delta === 0) return currentScoreFields(state);
  return {
    ...currentScoreFields(state),
    score: penalty.score,
    lastScoreEvent: {
      id: nextScoreEventId(state),
      row,
      col,
      delta: penalty.delta,
      multiplier: 1,
      closedUnits: NO_CLOSED_UNITS,
    },
  };
}

interface CorrectPlacementArgs extends PlacementScoringArgs {
  /** Сетка уже с поставленной цифрой — по ней проверяются закрытые юниты. */
  currentGrid: Grid;
}

/** Начисление за верную цифру. Клетка платит только при первой верной постановке. */
function scoreAfterCorrect({ state, row, col, currentGrid }: CorrectPlacementArgs): ScoreFields {
  if (state.scoredCells[row][col]) return currentScoreFields(state);

  const closedUnits = closedUnitsAt({ grid: currentGrid, solution: state.solution, row, col });
  const entry = scoreCorrectEntry({
    difficulty: state.difficulty,
    secondsSinceLastCorrect: state.elapsedSeconds - state.lastCorrectAtSecond,
    closedUnits,
  });
  const scoredCells = state.scoredCells.map((rowFlags) => [...rowFlags]);
  scoredCells[row][col] = true;

  return {
    score: state.score + entry.gained,
    lastCorrectAtSecond: state.elapsedSeconds,
    scoredCells,
    lastScoreEvent: {
      id: nextScoreEventId(state),
      row,
      col,
      delta: entry.gained,
      multiplier: entry.multiplier,
      closedUnits,
    },
  };
}
```

В `placeDigit` после вычисления `lives` поменять сборку `base`:

```ts
  const lives = wasMistake ? state.lives - 1 : state.lives;
  const scoreFields = wasMistake
    ? scoreAfterMistake({ state, row, col })
    : scoreAfterCorrect({ state, row, col, currentGrid });
  const base: GameState = {
    ...state,
    currentGrid,
    notes,
    history: [...state.history, move],
    lives,
    ...scoreFields,
  };
```

`restore` заменить:

```ts
// Всплывашки не переигрываем: событие относится к моменту ввода, а не к восстановлению.
const restore: Handler<Extract<GameAction, { type: 'RESTORE' }>> = (_state, action) => ({
  ...action.state,
  lastScoreEvent: null,
});
```

`erase` и `undo` не трогаем: очки копируются через `...state`.

- [ ] **Шаг 5: Запустить тесты reducer'а**

Run: `npx vitest run src/state/gameReducer.test.ts`
Expected: PASS (старые и новые).

- [ ] **Шаг 6: Написать падающие тесты миграции в `localGame.test.ts`**

Фикстура `sampleState` должна соответствовать новому типу. Импорт и тело:

```ts
import { saveGame, loadGame, clearGame, withScoreDefaults, GAME_STORAGE_KEY } from './localGame';
import { createInitialScoreFields } from '../gameReducer';
// в sampleState перед `...overrides`:
    ...createInitialScoreFields(),
```

Новые тесты:

```ts
const SCORE_FIELD_NAMES = ['score', 'lastCorrectAtSecond', 'scoredCells', 'lastScoreEvent'];

/** Партия в формате до фичи очков: тех же полей просто нет в JSON. */
function saveLegacyGame(overrides: Partial<GameState> = {}): void {
  const legacy: Record<string, unknown> = { ...sampleState(overrides) };
  for (const field of SCORE_FIELD_NAMES) delete legacy[field];
  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(legacy));
}

function solvedLikeGrid(): number[][] {
  return Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => ((row * 3 + Math.floor(row / 3) + col) % 9) + 1));
}

describe('localGame — мягкая миграция очков', () => {
  it('старая партия без полей очков восстанавливается, а не отбрасывается', () => {
    saveLegacyGame({ elapsedSeconds: 42 });
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.score).toBe(0);
    expect(loaded?.lastCorrectAtSecond).toBe(42);
    expect(loaded?.lastScoreEvent).toBeNull();
  });

  it('scoredCells = true только для уже верных НЕ исходных клеток', () => {
    const solution = solvedLikeGrid();
    const initialGrid = solution.map((row) => [...row]);
    initialGrid[0][0] = 0; // игрок поставил верно
    initialGrid[0][1] = 0; // игрок поставил неверно
    initialGrid[0][2] = 0; // пусто
    const currentGrid = solution.map((row) => [...row]);
    currentGrid[0][1] = solution[0][1] === 1 ? 2 : 1;
    currentGrid[0][2] = 0;
    saveLegacyGame({ solution, initialGrid, currentGrid });

    const scoredCells = loadGame()?.scoredCells;
    expect(scoredCells?.[0][0]).toBe(true);
    expect(scoredCells?.[0][1]).toBe(false);
    expect(scoredCells?.[0][2]).toBe(false);
    expect(scoredCells?.[4][4]).toBe(false); // исходная клетка очков не приносила
  });

  it('сохранённое lastScoreEvent при загрузке сбрасывается', () => {
    saveGame(
      sampleState({
        score: 300,
        lastScoreEvent: {
          id: 3,
          row: 0,
          col: 0,
          delta: 50,
          multiplier: 1,
          closedUnits: { row: false, col: false, box: false },
        },
      }),
    );
    const loaded = loadGame();
    expect(loaded?.score).toBe(300);
    expect(loaded?.lastScoreEvent).toBeNull();
  });

  it('withScoreDefaults не трогает уже заполненные поля', () => {
    const state = sampleState({ score: 120, lastCorrectAtSecond: 3 });
    const migrated = withScoreDefaults(state);
    expect(migrated.score).toBe(120);
    expect(migrated.lastCorrectAtSecond).toBe(3);
    expect(migrated.scoredCells).toBe(state.scoredCells);
  });
});
```

- [ ] **Шаг 7: Запустить — убедиться, что падает**

Run: `npx vitest run src/state/storage/localGame.test.ts`
Expected: FAIL — `withScoreDefaults` не экспортируется, у старой партии `score` — `undefined`.

- [ ] **Шаг 8: Реализовать миграцию в `localGame.ts`**

```ts
import { EMPTY_CELL } from '../../core';
import { GAME_SCHEMA_VERSION, type GameState, type ScoreFields } from '../gameTypes';

/** Партия, сохранённая до появления очков: полей ScoreFields может не быть (ADR-0007). */
type StoredGameState = Omit<GameState, keyof ScoreFields> & Partial<ScoreFields>;

/** Клетки, которые игрок уже решил верно, — они очков больше не приносят. */
function inferScoredCells(saved: StoredGameState): boolean[][] {
  return saved.currentGrid.map((rowValues, row) =>
    rowValues.map((value, col) => {
      const isGiven = saved.initialGrid[row][col] !== EMPTY_CELL;
      return !isGiven && value === saved.solution[row][col];
    }),
  );
}

/**
 * Мягкая миграция (ADR-0007): недостающие поля очков заполняются значениями по умолчанию,
 * партия не отбрасывается. lastScoreEvent сбрасывается всегда — всплывашки не переигрываем.
 */
export function withScoreDefaults(saved: StoredGameState): GameState {
  return {
    ...saved,
    score: saved.score ?? 0,
    lastCorrectAtSecond: saved.lastCorrectAtSecond ?? saved.elapsedSeconds,
    scoredCells: saved.scoredCells ?? inferScoredCells(saved),
    lastScoreEvent: null,
  };
}
```

`isRestorableGame` переименовать в тип-гард под `StoredGameState` (тело прежнее):

```ts
function isRestorableGame(value: unknown): value is StoredGameState {
```

В `loadGame` последнюю строку заменить:

```ts
  return isRestorableGame(parsed) ? withScoreDefaults(parsed) : null;
```

- [ ] **Шаг 9: Прогнать весь набор и type-check**

Run: `npm test && npm run type-check`
Expected: PASS.
- `GameContext.test` («восстанавливает in_progress партию») и `HomeScreen.test` сохраняют партии без полей очков — теперь они идут через миграцию и должны остаться зелёными.
- Если type-check ругается на литералы `GameState` в других тестах, добавить туда `...createInitialScoreFields()`.

- [ ] **Шаг 10: ADR-0007**

Создать `docs/adr/0007-soft-gamestate-migration.md`:

```markdown
# ADR-0007: Мягкая миграция GameState

**Статус:** принято
**Дата:** 2026-09-26

## Контекст

Незавершённая партия хранится в localStorage (`sudoku:game`) и при загрузке проверяется по
`schemaVersion`: партия с чужой версией отбрасывается (ADR-0002). Фича очков
([спека](../superpowers/specs/2026-09-26-player-score-design.md)) добавляет в `GameState` поля
`score`, `lastCorrectAtSecond`, `scoredCells`, `lastScoreEvent`. Рост `GAME_SCHEMA_VERSION` —
ломающее изменение: у игроков пропала бы партия, начатая до обновления, и по правилам
версионирования это major-изменение.

## Решение

Новые поля `GameState` добавляем **без роста `GAME_SCHEMA_VERSION`**. При загрузке
`loadGame` пропускает сохранёнку через `withScoreDefaults`, которая заполняет недостающие поля
значениями по умолчанию, выводя их из уже сохранённых данных, где это возможно:

- `score` → `0`;
- `lastCorrectAtSecond` → текущий `elapsedSeconds` (первая новая цифра не получает огромный интервал);
- `scoredCells` → `true` для неисходных клеток, уже совпадающих с решением;
- `lastScoreEvent` → всегда `null` (эфемерное поле, не восстанавливается).

`GAME_SCHEMA_VERSION` растёт, только когда старые данные невозможно разумно дополнить:
поменялся смысл или формат существующего поля.

## Последствия

- Обновление не отнимает у игрока начатую партию; версия остаётся minor.
- Прецедент для следующих фич: новое поле `GameState` = значение по умолчанию в `withScoreDefaults`
  (или соседней функции того же вида) + тест загрузки старой сохранёнки.
- Тип хранимых данных (`StoredGameState`) шире `GameState`: код загрузки обязан заполнять
  необязательные поля, остальной код видит только полный `GameState`.
- Валидация формы остаётся минимальной (как и раньше): повреждённые данные внутри полей не
  проверяются.
```

В `docs/adr/README.md` добавить строку в таблицу:

```markdown
| [0007](0007-soft-gamestate-migration.md) | Мягкая миграция GameState | принято | 2026-09-26 |
```

В `docs/roadmap.md` добавить строку в конец таблицы:

```markdown
| Очки игрока, уровни и ранги (очки за цифры, баланс, значки рангов, рекорды очков, экран победы с конфетти) | 🚧 в работе | backlog | Статистика, Механика жизней | feat/player-score | [спека](superpowers/specs/2026-09-26-player-score-design.md), [план](superpowers/plans/2026-09-26-player-score.md) | 2026-09-26 | — | [ADR-0007](adr/0007-soft-gamestate-migration.md) |
```

- [ ] **Шаг 11: Коммит**

```bash
git status
git add src/state/gameTypes.ts src/state/gameReducer.ts src/state/gameReducer.test.ts src/state/storage/localGame.ts src/state/storage/localGame.test.ts docs/adr/0007-soft-gamestate-migration.md docs/adr/README.md docs/roadmap.md
git commit -m "feat: начислять очки в партии и мягко мигрировать сохранёнку

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 3: журнал `score`, `RecordsContext`, снимок «до» в `GameContext`

**Файлы:**
- Создать: `src/state/completionSummary.ts`, `src/state/completionSummary.test.ts`
- Изменить: `src/state/RecordsContext.tsx`
- Создать: `src/state/RecordsContext.test.tsx`
- Изменить: `src/state/GameContext.tsx:40-61` (`GameApi`), `111-158` (`useRecordCompletion`), `207-220` (`newGame`), `222-245` (`api`)
- Изменить: `src/state/GameContext.test.tsx`

**Интерфейсы:**
- Использует: `totalScore`, `bestScoresByDifficulty`, `ScoreRecordsByDifficulty` (задача 1); `GameState.score` (задача 2); `bestTimesByDifficulty` из `statsService.ts`.
- Отдаёт:
  - `RecordsApi { records; bestScores: ScoreRecordsByDifficulty; totalScore: number; refresh() }`
  - `interface CompletionSnapshot { records; bestScores; totalScore }`
  - `interface CompletionSummary { isNewRecord; isNewScoreRecord; prevTotalScore; nextTotalScore }`
  - `NO_COMPLETION: CompletionSummary`
  - `summarizeCompletion({ result, difficulty, elapsedSeconds, score, snapshot }): CompletionSummary`
  - `GameApi.completion: CompletionSummary` (`GameApi.isNewRecord` сохраняется)

- [ ] **Шаг 1: Написать падающие тесты `completionSummary.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { summarizeCompletion, type CompletionSnapshot } from './completionSummary';

const EMPTY_JOURNAL: CompletionSnapshot = {
  records: { easy: null, medium: null, hard: null },
  bestScores: { easy: null, medium: null, hard: null },
  totalScore: 0,
};

describe('summarizeCompletion', () => {
  it('первая победа — рекорд времени и очков, баланс растёт на счёт партии', () => {
    const summary = summarizeCompletion({
      result: 'won',
      difficulty: 'easy',
      elapsedSeconds: 300,
      score: 1200,
      snapshot: EMPTY_JOURNAL,
    });
    expect(summary).toEqual({
      isNewRecord: true,
      isNewScoreRecord: true,
      prevTotalScore: 0,
      nextTotalScore: 1200,
    });
  });

  it('рекорд очков только при строго большем счёте', () => {
    const snapshot: CompletionSnapshot = {
      records: { easy: 100, medium: null, hard: null },
      bestScores: { easy: 1200, medium: null, hard: null },
      totalScore: 5000,
    };
    const tie = summarizeCompletion({ result: 'won', difficulty: 'easy', elapsedSeconds: 200, score: 1200, snapshot });
    expect(tie.isNewScoreRecord).toBe(false);
    expect(tie.isNewRecord).toBe(false);
    const better = summarizeCompletion({ result: 'won', difficulty: 'easy', elapsedSeconds: 90, score: 1300, snapshot });
    expect(better.isNewScoreRecord).toBe(true);
    expect(better.isNewRecord).toBe(true);
    expect(better.nextTotalScore).toBe(6300);
  });

  it('поражение: рекордов нет, баланс не меняется (очки сгорают)', () => {
    const summary = summarizeCompletion({
      result: 'lost',
      difficulty: 'hard',
      elapsedSeconds: 50,
      score: 900,
      snapshot: { ...EMPTY_JOURNAL, totalScore: 7000 },
    });
    expect(summary).toEqual({
      isNewRecord: false,
      isNewScoreRecord: false,
      prevTotalScore: 7000,
      nextTotalScore: 7000,
    });
  });

  it('журнал не загружен (пустой снимок) — «после» считается локально', () => {
    const summary = summarizeCompletion({ result: 'won', difficulty: 'medium', elapsedSeconds: 10, score: 500, snapshot: EMPTY_JOURNAL });
    expect(summary.nextTotalScore).toBe(500);
  });
});
```

- [ ] **Шаг 2: Запустить — убедиться, что падает**

Run: `npx vitest run src/state/completionSummary.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Шаг 3: Реализовать `src/state/completionSummary.ts`**

```ts
import type { Difficulty } from '../core';
import type { GameResult } from './gameTypes';
import type { ScoreRecordsByDifficulty } from './progress';

/** Агрегаты журнала на момент ДО записи завершённой партии. */
export interface CompletionSnapshot {
  records: Record<Difficulty, number | null>;
  bestScores: ScoreRecordsByDifficulty;
  totalScore: number;
}

export interface CompletionSummary {
  isNewRecord: boolean;
  isNewScoreRecord: boolean;
  prevTotalScore: number;
  /** Баланс «после» считается локально — экран победы не ждёт журнал. */
  nextTotalScore: number;
}

export const NO_COMPLETION: CompletionSummary = {
  isNewRecord: false,
  isNewScoreRecord: false,
  prevTotalScore: 0,
  nextTotalScore: 0,
};

interface SummarizeCompletionArgs {
  result: GameResult;
  difficulty: Difficulty;
  elapsedSeconds: number;
  score: number;
  snapshot: CompletionSnapshot;
}

export function summarizeCompletion({
  result,
  difficulty,
  elapsedSeconds,
  score,
  snapshot,
}: SummarizeCompletionArgs): CompletionSummary {
  const prevTotalScore = snapshot.totalScore;
  // Очки проигранной партии сгорают: ни рекордов, ни прироста баланса.
  if (result === 'lost') {
    return { ...NO_COMPLETION, prevTotalScore, nextTotalScore: prevTotalScore };
  }
  const prevBestTime = snapshot.records[difficulty];
  const prevBestScore = snapshot.bestScores[difficulty];
  return {
    isNewRecord: prevBestTime === null || elapsedSeconds < prevBestTime,
    isNewScoreRecord: prevBestScore === null || score > prevBestScore,
    prevTotalScore,
    nextTotalScore: prevTotalScore + score,
  };
}
```

- [ ] **Шаг 4: Запустить тест**

Run: `npx vitest run src/state/completionSummary.test.ts`
Expected: PASS.

- [ ] **Шаг 5: Написать падающий тест `RecordsContext.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { RecordsProvider, useRecords } from './RecordsContext';

vi.mock('./storage/historyDb', () => ({
  getAllCompletedGames: vi.fn().mockResolvedValue([
    { id: '1', difficulty: 'easy', durationSeconds: 90, completedAt: '2026-09-01T00:00:00.000Z', outcome: 'won', score: 800 },
    { id: '2', difficulty: 'easy', durationSeconds: 60, completedAt: '2026-09-02T00:00:00.000Z', outcome: 'won', score: 1200 },
    { id: '3', difficulty: 'hard', durationSeconds: 30, completedAt: '2026-09-03T00:00:00.000Z', outcome: 'lost', score: 0 },
    { id: '4', difficulty: 'medium', durationSeconds: 400, completedAt: '2026-08-01T00:00:00.000Z', outcome: 'won' },
  ]),
}));

afterEach(cleanup);

function Probe() {
  const { records, bestScores, totalScore } = useRecords();
  return (
    <div>
      <span data-testid="total">{totalScore}</span>
      <span data-testid="best-easy">{String(bestScores.easy)}</span>
      <span data-testid="best-medium">{String(bestScores.medium)}</span>
      <span data-testid="time-easy">{String(records.easy)}</span>
    </div>
  );
}

describe('RecordsContext', () => {
  it('отдаёт баланс, рекорды очков и рекорды времени из журнала', async () => {
    render(
      <RecordsProvider>
        <Probe />
      </RecordsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('2000'));
    expect(screen.getByTestId('best-easy')).toHaveTextContent('1200');
    expect(screen.getByTestId('best-medium')).toHaveTextContent('null');
    expect(screen.getByTestId('time-easy')).toHaveTextContent('60');
  });
});
```

- [ ] **Шаг 6: Запустить — убедиться, что падает**

Run: `npx vitest run src/state/RecordsContext.test.tsx`
Expected: FAIL — `total` пустой (`totalScore` нет в API).

- [ ] **Шаг 7: Реализовать `RecordsContext.tsx`**

Полное содержимое файла:

```tsx
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Difficulty } from '../core';
import { getAllCompletedGames } from './storage/historyDb';
import { bestTimesByDifficulty } from './statsService';
import { bestScoresByDifficulty, totalScore, type ScoreRecordsByDifficulty } from './progress';

export type RecordsByDifficulty = Record<Difficulty, number | null>;

/** Агрегаты журнала — единственный контекст, который их считает. */
interface JournalAggregates {
  records: RecordsByDifficulty;
  bestScores: ScoreRecordsByDifficulty;
  totalScore: number;
}

const EMPTY_AGGREGATES: JournalAggregates = {
  records: { easy: null, medium: null, hard: null },
  bestScores: { easy: null, medium: null, hard: null },
  totalScore: 0,
};

export interface RecordsApi extends JournalAggregates {
  refresh(): Promise<void>;
}

const RecordsContext = createContext<RecordsApi | null>(null);

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [aggregates, setAggregates] = useState<JournalAggregates>(EMPTY_AGGREGATES);

  const refresh = useCallback(async () => {
    const games = await getAllCompletedGames();
    setAggregates({
      records: bestTimesByDifficulty(games),
      bestScores: bestScoresByDifficulty(games),
      totalScore: totalScore(games),
    });
  }, []);

  useEffect(() => {
    // refresh асинхронный: setState вызывается после await, не синхронно в теле
    // эффекта — правило это не распознаёт, поэтому подавляем точечно.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const api = useMemo<RecordsApi>(() => ({ ...aggregates, refresh }), [aggregates, refresh]);

  return <RecordsContext.Provider value={api}>{children}</RecordsContext.Provider>;
}

export function useRecords(): RecordsApi {
  const context = useContext(RecordsContext);
  if (!context) throw new Error('useRecords должен использоваться внутри RecordsProvider');
  return context;
}
```

- [ ] **Шаг 8: Запустить тест**

Run: `npx vitest run src/state/RecordsContext.test.tsx`
Expected: PASS.

- [ ] **Шаг 9: Написать падающие тесты журнала в `GameContext.test.tsx`**

В `describe('GameProvider — запись CompletedGame')` поправить и дописать ассерты. `puzzleOneHole` — одна дыра (0,0), последняя цифра на `elapsed = 0`: easy, 50 × 15 = 750.

```tsx
  it('победа пишет score партии', async () => {
    const apiRef = renderWithApi(); // существующий хелпер файла, которым пользуются соседние тесты
    startGame(apiRef);
    fillFromSolution(apiRef);
    await waitFor(() => {
      expect(vi.mocked(historyDb.recordCompletedGame)).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(historyDb.recordCompletedGame).mock.calls[0][0]).toMatchObject({
      outcome: 'won',
      score: 750,
    });
    expect(apiRef.current!.completion).toMatchObject({
      isNewScoreRecord: true,
      prevTotalScore: 0,
      nextTotalScore: 750,
    });
  });

  it('поражение пишет score: 0 — очки сгорают', async () => {
    const apiRef = renderWithApi();
    startGame(apiRef);
    loseAllLives(apiRef);
    await waitFor(() => {
      const calls = vi.mocked(historyDb.recordCompletedGame).mock.calls;
      expect(calls.some((call) => call[0].outcome === 'lost' && call[0].score === 0)).toBe(true);
    });
  });

  it('брошенная партия пишет score: 0', async () => {
    const apiRef = renderWithApi();
    startGame(apiRef);
    makeOneMove(apiRef);
    startGame(apiRef);
    await waitFor(() => {
      const calls = vi.mocked(historyDb.recordCompletedGame).mock.calls;
      expect(calls.some((call) => call[0].outcome === 'abandoned' && call[0].score === 0)).toBe(true);
    });
  });
```

> Перед написанием проверить, как в файле называется хелпер рендера с `apiRef` (соседние тесты `победа пишет outcome=won…` его используют), и взять то же имя. Если хелпер — `renderWithApi`, код выше подходит как есть.

В тесте «восстанавливает in_progress партию из localStorage» дописать ассерт миграции:

```tsx
    expect(apiRef.current!.state.score).toBe(0); // или через Probe — как устроен этот тест
```

- [ ] **Шаг 10: Запустить — убедиться, что падает**

Run: `npx vitest run src/state/GameContext.test.tsx`
Expected: FAIL — в записи нет `score`, `completion` — `undefined`.

- [ ] **Шаг 11: Реализовать в `GameContext.tsx`**

Импорты:

```ts
import {
  NO_COMPLETION,
  summarizeCompletion,
  type CompletionSnapshot,
  type CompletionSummary,
} from './completionSummary';
```

В `GameApi` после `isNewRecord: boolean;` добавить:

```ts
  /** Итоги завершённой партии для экрана победы; NO_COMPLETION, пока партия идёт. */
  completion: CompletionSummary;
```

`useRecordCompletion` заменить целиком:

```ts
/**
 * Пишет CompletedGame один раз при переходе партии в 'completed' и считает итоги для экрана
 * победы. Снимок журнала (рекорды, баланс) читается ДО записи/refresh — иначе свежий результат
 * сам бы стал «предыдущим».
 */
function useRecordCompletion(state: GameState): CompletionSummary {
  const journal = useRecords();
  const { refresh } = journal;
  const [completion, setCompletion] = useState<CompletionSummary>(NO_COMPLETION);
  const prevStatus = useRef(state.status);

  // Держим свежие агрегаты журнала в ref, чтобы эффект завершения не зависел от них
  // (иначе он бы перезапускался на каждый refresh).
  const journalRef = useRef<CompletionSnapshot>(journal);
  useEffect(() => {
    journalRef.current = journal;
  }, [journal]);

  useEffect(() => {
    // setState здесь — намеренная реакция на переход партии в/из 'completed'.
    // Правило этого не распознаёт.
    /* eslint-disable react-hooks/set-state-in-effect */
    const justCompleted = prevStatus.current !== 'completed' && state.status === 'completed';
    prevStatus.current = state.status;
    if (state.status !== 'completed') setCompletion(NO_COMPLETION);
    const result = state.result;
    if (!justCompleted || result === undefined) return;

    setCompletion(
      summarizeCompletion({
        result,
        difficulty: state.difficulty,
        elapsedSeconds: state.elapsedSeconds,
        score: state.score,
        snapshot: journalRef.current,
      }),
    );

    // Очки проигранной партии сгорают — в баланс идут только победы.
    const recordedScore = result === 'won' ? state.score : 0;
    void (async () => {
      await recordCompletedGame({
        difficulty: state.difficulty,
        durationSeconds: state.elapsedSeconds,
        completedAt: new Date().toISOString(),
        outcome: result,
        score: recordedScore,
      });
      await refresh();
    })();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state.status, state.result, state.difficulty, state.elapsedSeconds, state.score, refresh]);

  return completion;
}
```

В `GameProvider`:

```ts
  const completion = useRecordCompletion(state);
```

В `recordCompletedGame` внутри `newGame` добавить `score: 0,` после `outcome: 'abandoned',`.

В `api`: `isNewRecord: completion.isNewRecord,` и `completion,`.

- [ ] **Шаг 12: Прогнать весь набор, type-check, lint**

Run: `npm test && npm run type-check && npm run lint`
Expected: PASS. `GameScreen` пока использует `game.isNewRecord` — поле сохранено.

- [ ] **Шаг 13: Коммит**

```bash
git status
git add src/state/completionSummary.ts src/state/completionSummary.test.ts src/state/RecordsContext.tsx src/state/RecordsContext.test.tsx src/state/GameContext.tsx src/state/GameContext.test.tsx
git commit -m "feat: записывать очки партии в журнал и считать баланс

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 4: `RankBadge` и `LevelProgress` на главном экране и в статистике

**Файлы:**
- Создать:
  - `src/components/rank/formatPoints.ts` + `formatPoints.test.ts`
  - `src/components/rank/progressCaptions.ts` + `progressCaptions.test.ts`
  - `src/components/rank/rankGlyphs.tsx`
  - `src/components/rank/RankBadge.tsx` + `RankBadge.module.css`
  - `src/components/rank/LevelProgress.tsx` + `LevelProgress.module.css` + `LevelProgress.test.tsx`
- Изменить: `src/components/home/HomeScreen.tsx`, `HomeScreen.module.css`, `HomeScreen.test.tsx`
- Изменить: `src/components/stats/StatsView.tsx`, `StatsView.module.css`, `StatsView.test.tsx`
- Изменить: `src/components/settings/SettingsScreen.tsx`, `SettingsScreen.module.css`, `SettingsScreen.test.tsx`

**Интерфейсы:**
- Использует: `levelInfo`, `rankForLevel`, `nextRankAfter`, `Rank`, `RankId`, `totalScore`, `bestScoresByDifficulty` (задача 1); `useRecords().totalScore` (задача 3).
- Отдаёт:
  - `formatPoints(points: number): string` — группы разрядов через неразрывный пробел ` `
  - `pointsWord(count: number): string`
  - `homeProfileCaption(total: number): string`, `statsProgressCaption(total: number): string`
  - `RANK_GLYPHS: Record<RankId, ReactNode>`
  - `<RankBadge rank={Rank} size={number} />` — корень `data-testid="rank-badge"`, `data-rank={rank.id}`
  - `<LevelProgress totalScore={number} caption={string} />` — `level-progress`, `level-number`, `rank-name`

- [ ] **Шаг 1: Падающие тесты `formatPoints.test.ts` и `progressCaptions.test.ts`**

```ts
// formatPoints.test.ts
import { describe, it, expect } from 'vitest';
import { formatPoints, pointsWord } from './formatPoints';

describe('formatPoints', () => {
  it.each([
    { points: 0, expected: '0' },
    { points: 750, expected: '750' },
    { points: 21640, expected: '21 640' },
    { points: 1234567, expected: '1 234 567' },
  ])('$points → $expected', ({ points, expected }) => {
    expect(formatPoints(points)).toBe(expected);
  });
});

describe('pointsWord', () => {
  it.each([
    { count: 1, expected: 'очко' },
    { count: 21, expected: 'очко' },
    { count: 2, expected: 'очка' },
    { count: 24, expected: 'очка' },
    { count: 5, expected: 'очков' },
    { count: 11, expected: 'очков' },
    { count: 0, expected: 'очков' },
    { count: 89810, expected: 'очков' },
  ])('$count $expected', ({ count, expected }) => {
    expect(pointsWord(count)).toBe(expected);
  });
});
```

```ts
// progressCaptions.test.ts
import { describe, it, expect } from 'vitest';
import { homeProfileCaption, statsProgressCaption } from './progressCaptions';

describe('progressCaptions', () => {
  it('главный: баланс и остаток до следующего уровня', () => {
    expect(homeProfileCaption(89810)).toBe('89 810 очков · до ур. 7: 15 190');
  });

  it('статистика: баланс и следующий ранг', () => {
    expect(statsProgressCaption(89810)).toBe('89 810 очков · след. ранг: Знаток на ур. 8');
  });

  it('статистика на последнем ранге — только баланс', () => {
    expect(statsProgressCaption(1_500_000)).toBe('1 500 000 очков');
  });
});
```

- [ ] **Шаг 2: Запустить — FAIL (модулей нет)**

Run: `npx vitest run src/components/rank`
Expected: FAIL — `Failed to resolve import`.

- [ ] **Шаг 3: Реализовать `formatPoints.ts` и `progressCaptions.ts`**

```ts
// formatPoints.ts
const THOUSANDS_GROUP = /\B(?=(\d{3})+(?!\d))/g;
const NARROW_GAP = ' ';

/** 21640 → «21 640» (неразрывный пробел — число не переносится). */
export function formatPoints(points: number): string {
  return String(Math.round(points)).replace(THOUSANDS_GROUP, NARROW_GAP);
}

const POINTS_PLURAL = new Intl.PluralRules('ru-RU');

const POINTS_WORDS: Record<Intl.LDMLPluralRule, string> = {
  zero: 'очков',
  one: 'очко',
  two: 'очка',
  few: 'очка',
  many: 'очков',
  other: 'очка',
};

export function pointsWord(count: number): string {
  return POINTS_WORDS[POINTS_PLURAL.select(count)];
}
```

```ts
// progressCaptions.ts
import { levelInfo, nextRankAfter } from '../../state/progress';
import { formatPoints, pointsWord } from './formatPoints';

function balanceText(total: number): string {
  return `${formatPoints(total)} ${pointsWord(total)}`;
}

/** «89 810 очков · до ур. 7: 15 190» */
export function homeProfileCaption(total: number): string {
  const info = levelInfo(total);
  return `${balanceText(total)} · до ур. ${info.level + 1}: ${formatPoints(info.pointsToNext)}`;
}

/** «89 810 очков · след. ранг: Знаток на ур. 8»; на последнем ранге — только баланс. */
export function statsProgressCaption(total: number): string {
  const nextRank = nextRankAfter(levelInfo(total).level);
  if (nextRank === null) return balanceText(total);
  return `${balanceText(total)} · след. ранг: ${nextRank.name} на ур. ${nextRank.fromLevel}`;
}
```

- [ ] **Шаг 4: Запустить — PASS**

Run: `npx vitest run src/components/rank`
Expected: PASS.

- [ ] **Шаг 5: Глифы и `RankBadge`**

`src/components/rank/rankGlyphs.tsx`. Пути глифов финальные, из брейншторма:

```tsx
import type { ReactNode } from 'react';
import type { RankId } from '../../state/progress';

/** Белые контурные глифы рангов (viewBox 24, stroke 1.8). Общие атрибуты — на <svg> в RankBadge. */
export const RANK_GLYPHS: Record<RankId, ReactNode> = {
  novice: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6z" />
      <path d="M12 11c0-4 3-7 7-7 0 4-3 7-7 7z" />
    </>
  ),
  apprentice: (
    <>
      <path d="M12 6c-2-1.5-5-2-8-1.5V18c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6z" />
      <path d="M12 6v13.5" />
    </>
  ),
  amateur: (
    <g transform="rotate(-45 12 12)">
      <path d="M6.5 4.5h8.5l3 1.8v1.4l-3 1.8H6.5z" />
      <path d="M10.8 9.5h2.4V21h-2.4z" />
    </g>
  ),
  connoisseur: (
    <>
      <path d="M2 9l10-4 10 4-10 4z" />
      <path d="M6 11v4c0 1.5 3 3 6 3s6-1.5 6-3v-4" />
      <path d="M22 9v5" />
    </>
  ),
  expert: (
    <>
      <path d="M7 4h10l4 5-9 11L3 9z" />
      <path d="M3 9h18M12 20 8.5 9 10 4M12 20l3.5-11L14 4" />
    </>
  ),
  master: (
    <>
      <path d="M8 3l2.5 6M16 3l-2.5 6" />
      <circle cx="12" cy="15" r="5.5" />
      <path
        d="M12 12.5l.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2z"
        fill="#fff"
      />
    </>
  ),
  grandmaster: <path d="M4 18h16M4.5 16 3 7l5 4 4-6 4 6 5-4-1.5 9z" />,
};
```

`src/components/rank/RankBadge.tsx`:

```tsx
import type { CSSProperties } from 'react';
import type { Rank } from '../../state/progress';
import { RANK_GLYPHS } from './rankGlyphs';
import styles from './RankBadge.module.css';

interface RankBadgeProps {
  rank: Rank;
  /** Диаметр круга в px: 48 — экран победы, 44 — главный и статистика. */
  size: number;
}

export default function RankBadge({ rank, size }: RankBadgeProps) {
  const circleStyle = { '--rank-color': rank.color, '--badge-size': `${size}px` } as CSSProperties;
  return (
    <div
      className={styles.badge}
      style={circleStyle}
      data-testid="rank-badge"
      data-rank={rank.id}
      role="img"
      aria-label={`Ранг: ${rank.name}`}
    >
      <svg
        className={styles.glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {RANK_GLYPHS[rank.id]}
      </svg>
    </div>
  );
}
```

`RankBadge.module.css`:

```css
.badge {
  width: var(--badge-size);
  height: var(--badge-size);
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--rank-color) 80%, #fff),
    var(--rank-color)
  );
  box-shadow: 0 8px 18px -8px var(--rank-color);
}

.glyph {
  width: 58%;
  height: 58%;
}
```

- [ ] **Шаг 6: Падающий тест `LevelProgress.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import LevelProgress from './LevelProgress';

afterEach(cleanup);

describe('LevelProgress', () => {
  it('показывает уровень, ранг, значок и подпись', () => {
    render(<LevelProgress totalScore={89810} caption="подпись" />);
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 6');
    expect(screen.getByTestId('rank-name')).toHaveTextContent('Любитель');
    expect(screen.getByTestId('rank-badge')).toHaveAttribute('data-rank', 'amateur');
    expect(screen.getByTestId('level-progress')).toHaveTextContent('подпись');
  });

  it('пустой баланс — уровень 1, Новичок', () => {
    render(<LevelProgress totalScore={0} caption="" />);
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 1');
    expect(screen.getByTestId('rank-name')).toHaveTextContent('Новичок');
  });
});
```

Run: `npx vitest run src/components/rank/LevelProgress.test.tsx` — Expected: FAIL (модуля нет).

- [ ] **Шаг 7: Реализовать `LevelProgress`**

```tsx
import { levelInfo, rankForLevel } from '../../state/progress';
import RankBadge from './RankBadge';
import styles from './LevelProgress.module.css';

const PROFILE_BADGE_SIZE = 44;

interface LevelProgressProps {
  totalScore: number;
  caption: string;
}

export default function LevelProgress({ totalScore, caption }: LevelProgressProps) {
  const info = levelInfo(totalScore);
  const rank = rankForLevel(info.level);
  const fillPercent = (info.pointsIntoLevel / info.pointsForLevel) * 100;

  return (
    <div className={styles.progress} data-testid="level-progress">
      <RankBadge rank={rank} size={PROFILE_BADGE_SIZE} />
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <span className={styles.level} data-testid="level-number">
            Уровень {info.level}
          </span>
          <span className={styles.rankName} data-testid="rank-name">
            {rank.name}
          </span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${fillPercent}%` }} />
        </div>
        <div className={styles.caption}>{caption}</div>
      </div>
    </div>
  );
}
```

`LevelProgress.module.css`:

```css
.progress {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  text-align: left;
}

.body {
  flex: 1;
  min-width: 0;
}

.titleRow {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.level {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.rankName {
  font-size: 13px;
  color: var(--ink-subtle);
}

.track {
  height: 6px;
  border-radius: 3px;
  background: var(--divider);
  margin-top: 8px;
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 3px;
  background: var(--accent);
}

.caption {
  font-size: 12px;
  color: var(--ink-subtle);
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}
```

Run: `npx vitest run src/components/rank` — Expected: PASS.

- [ ] **Шаг 8: Падающие тесты главного экрана**

В `HomeScreen.test.tsx`: мок `getAllCompletedGames` из `vi.mock` на весь файл возвращает `[]`. Добавить:

```tsx
  it('карточка профиля: уровень 1 и Новичок при пустом журнале', async () => {
    renderHome();
    const profile = await screen.findByTestId('home-profile');
    expect(profile).toHaveTextContent('Уровень 1');
    expect(screen.getByTestId('rank-name')).toHaveTextContent('Новичок');
  });

  it('тап по карточке профиля ведёт в статистику', () => {
    renderHome();
    fireEvent.click(screen.getByTestId('home-profile'));
    expect(screen.getByTestId('current-screen')).toHaveTextContent('stats');
  });
```

Run: `npx vitest run src/components/home` — Expected: FAIL (`home-profile` не найден).

- [ ] **Шаг 9: Реализовать карточку профиля в `HomeScreen.tsx`**

Импорты:

```tsx
import { useRecords } from '../../state/RecordsContext';
import LevelProgress from '../rank/LevelProgress';
import { homeProfileCaption } from '../rank/progressCaptions';
```

В `HomeScreen` после `const game = useGame();`:

```tsx
  const { totalScore } = useRecords();
```

Разметка — сразу после блока `.brand`:

```tsx
      <button
        type="button"
        className={styles.profileCard}
        data-testid="home-profile"
        onClick={() => navigate('stats')}
      >
        <LevelProgress totalScore={totalScore} caption={homeProfileCaption(totalScore)} />
      </button>
```

`HomeScreen.module.css`. Стиль карточки такой же, как у `.continueCard`: перед правкой свериться с ним и выровнять отступы.

```css
.profileCard {
  width: 100%;
  border: 1px solid var(--card-border);
  background: var(--card);
  border-radius: 20px;
  padding: 16px;
  margin-top: 20px;
  box-shadow: var(--shadow-card);
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
```

Run: `npx vitest run src/components/home` — Expected: PASS.

- [ ] **Шаг 10: Падающие тесты статистики**

В `StatsView.test.tsx`: `SAMPLE` дополнить очками, добавить старую победу без `score` и тесты.

```ts
const SAMPLE: CompletedGame[] = [
  { id: '1', difficulty: 'easy', durationSeconds: 100, completedAt: iso(0), outcome: 'won', score: 21640 },
  { id: '2', difficulty: 'easy', durationSeconds: 300, completedAt: iso(0), outcome: 'won', score: 900 },
  { id: '3', difficulty: 'hard', durationSeconds: 50, completedAt: iso(20), outcome: 'lost', score: 0 },
  { id: '4', difficulty: 'medium', durationSeconds: 500, completedAt: iso(20), outcome: 'won' },
];
```

> Из-за записи `id: '4'` поменяются ожидания существующих тестов: побед станет 3, партий 4, изменятся лучшее и среднее время. Прогнать файл, найти ассерты, которые разошлись, и поправить числа по новому `SAMPLE`. Логику тестов не менять.

```tsx
  it('карточка прогресса считает баланс по всему журналу', async () => {
    renderStats();
    await waitFor(() => {
      expect(screen.getByTestId('stats-progress')).toHaveTextContent('Уровень 3');
    });
    // 21 640 + 900 = 22 540 → уровень 3 (с 15 000), ранг Ученик
    expect(screen.getByTestId('rank-name')).toHaveTextContent('Ученик');
    expect(screen.getByTestId('stats-progress')).toHaveTextContent('22 540 очков');
  });

  it('рекорд очков по сложности; без побед с очками — прочерк', async () => {
    renderStats();
    await waitFor(() => {
      expect(screen.getByTestId('stat-diff-easy-best-score')).toHaveTextContent('★ 21 640 очков');
    });
    expect(screen.getByTestId('stat-diff-medium-best-score')).toHaveTextContent('—');
    expect(screen.getByTestId('stat-diff-hard-best-score')).toHaveTextContent('—');
  });

  it('рекорд очков зависит от периода, баланс — нет', async () => {
    renderStats();
    fireEvent.click(await screen.findByTestId('period-day'));
    await waitFor(() => {
      expect(screen.getByTestId('stat-diff-easy-best-score')).toHaveTextContent('21 640');
    });
    expect(screen.getByTestId('stats-progress')).toHaveTextContent('22 540');
  });
```

Run: `npx vitest run src/components/stats` — Expected: FAIL.

- [ ] **Шаг 11: Реализовать в `StatsView.tsx`**

Импорты:

```tsx
import { bestScoresByDifficulty, totalScore } from '../../state/progress';
import LevelProgress from '../rank/LevelProgress';
import { formatPoints, pointsWord } from '../rank/formatPoints';
import { statsProgressCaption } from '../rank/progressCaptions';
```

Хелпер рядом с `formatSeconds`:

```tsx
function formatBestScore(score: number | null): string {
  if (score === null) return '—';
  return `★ ${formatPoints(score)} ${pointsWord(score)}`;
}
```

`DifficultyRowProps` дополнить `bestScore: number | null;`. Под `.diffBest` в `DifficultyRow`:

```tsx
        <div className={styles.diffBestScore} data-testid={`stat-diff-${difficulty}-best-score`}>
          {formatBestScore(bestScore)}
        </div>
```

`useMemo` расширить. Баланс считается по всему журналу, рекорд очков — по периоду:

```tsx
  const { stats, totalGames, bestScores } = useMemo(() => {
    const filtered = filterByPeriod(games, period, new Date());
    return {
      stats: computeStats(filtered),
      totalGames: filtered.length,
      bestScores: bestScoresByDifficulty(filtered),
    };
  }, [games, period]);
  // Баланс и уровень не зависят от выбранного периода.
  const balance = useMemo(() => totalScore(games), [games]);
```

Разметка — перед `.periods`:

```tsx
      <div className={styles.progressCard} data-testid="stats-progress">
        <LevelProgress totalScore={balance} caption={statsProgressCaption(balance)} />
      </div>
```

В `DifficultyRow` передать `bestScore={bestScores[difficulty]}`.

`StatsView.module.css`:

```css
.progressCard {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-card);
}

.diffBestScore {
  font-size: 12px;
  color: var(--diff-medium);
  font-variant-numeric: tabular-nums;
}
```

Run: `npx vitest run src/components/stats` — Expected: PASS.

- [ ] **Шаг 12: Подпись о сбросе очков в настройках**

Тест в `SettingsScreen.test.tsx`:

```tsx
  it('рядом со сбросом предупреждение, что сбросятся очки, уровень и ранг', () => {
    renderSettings();
    expect(screen.getByTestId('reset-stats-hint')).toHaveTextContent(
      'Вместе со статистикой сбросятся очки, уровень и ранг',
    );
  });
```

Run: `npx vitest run src/components/settings` — Expected: FAIL.

В `SettingsScreen.tsx` сразу после кнопки `reset-stats`, внутри того же `.row`:

```tsx
          <div className={styles.resetHint} data-testid="reset-stats-hint">
            Вместе со статистикой сбросятся очки, уровень и ранг
          </div>
```

В `SettingsScreen.module.css`. Если `.row` — горизонтальный flex, подпись должна переноситься под кнопку: проверить в браузере и при необходимости добавить `flex-wrap: wrap` / `flex-basis: 100%`.

```css
.resetHint {
  font-size: 12px;
  color: var(--ink-subtle);
  margin-top: 6px;
}
```

Run: `npx vitest run src/components/settings` — Expected: PASS.

- [ ] **Шаг 13: Весь набор, type-check, lint**

Run: `npm test && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Шаг 14: Коммит**

```bash
git status
git add src/components/rank src/components/home src/components/stats src/components/settings
git commit -m "feat: показать уровень и ранг на главном экране и в статистике

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 5: счёт в шапке, токены, всплывашки над клеткой

**Файлы:**
- Создать:
  - `src/hooks/usePrefersReducedMotion.ts` + `.test.ts`
  - `src/hooks/useCountUp.ts` + `.test.ts`
  - `src/components/header/ScoreDisplay.tsx` + `ScoreDisplay.module.css`
  - `src/components/board/ScorePopup.tsx`, `src/components/board/ClosedUnitsFlash.tsx`, `src/components/board/ScorePopup.module.css`, `src/components/board/ScorePopup.test.tsx`
- Изменить:
  - `src/theme/tokens.css`
  - `src/components/header/Header.tsx`, `Header.test.tsx`
  - `src/components/board/Board.tsx`, `Board.module.css`, `Board.test.tsx`
  - `src/components/game/GameScreen.tsx`

**Интерфейсы:**
- Использует: `GameState.score`, `ScoreEvent` (задача 2); `formatPoints` (задача 4).
- Отдаёт:
  - `usePrefersReducedMotion(): boolean`
  - `easeOutCubic(progress: number): number`
  - `useCountUp({ target, durationMs, enabled }): number` — при `enabled = false` сразу возвращает `target`
  - `BoardProps.scoreEvent?: ScoreEvent | null`

- [ ] **Шаг 1: Падающие тесты хуков**

```ts
// src/hooks/usePrefersReducedMotion.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

afterEach(() => vi.unstubAllGlobals());

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(media));
  return {
    change(next: boolean) {
      media.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('usePrefersReducedMotion', () => {
  it('без matchMedia (jsdom по умолчанию) — false', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(false);
  });

  it('читает текущее значение и реагирует на смену', () => {
    const control = stubMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
    act(() => control.change(false));
    expect(result.current).toBe(false);
  });
});
```

```ts
// src/hooks/useCountUp.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { easeOutCubic, useCountUp } from './useCountUp';

afterEach(() => vi.useRealTimers());

describe('easeOutCubic', () => {
  it('0 → 0, 1 → 1, середина выше линейной', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('useCountUp', () => {
  it('выключен — сразу целевое значение', () => {
    const { result, rerender } = renderHook((props) => useCountUp(props), {
      initialProps: { target: 0, durationMs: 450, enabled: false },
    });
    rerender({ target: 750, durationMs: 450, enabled: false });
    expect(result.current).toBe(750);
  });

  it('включён — набегает и к концу длительности равен цели', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { result, rerender } = renderHook((props) => useCountUp(props), {
      initialProps: { target: 0, durationMs: 450, enabled: true },
    });
    rerender({ target: 750, durationMs: 450, enabled: true });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(750);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(750);
  });
});
```

Run: `npx vitest run src/hooks` — Expected: FAIL (модулей нет).

- [ ] **Шаг 2: Реализовать хуки**

```ts
// src/hooks/usePrefersReducedMotion.ts
import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function canQueryMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function readPreference(): boolean {
  if (!canQueryMedia()) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Пользователь попросил меньше анимации — отключаем набегание, всплывашки и конфетти. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPreference);

  useEffect(() => {
    if (!canQueryMedia()) return;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
```

```ts
// src/hooks/useCountUp.ts
import { useEffect, useRef, useState } from 'react';

export function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

interface CountUpArgs {
  target: number;
  durationMs: number;
  /** false — без анимации: сразу возвращается target. */
  enabled: boolean;
}

/** Число, плавно набегающее от предыдущего значения к target на requestAnimationFrame. */
export function useCountUp({ target, durationMs, enabled }: CountUpArgs): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    if (!enabled) {
      shownRef.current = target;
      return;
    }
    const from = shownRef.current;
    if (from === target) return;

    let frameId = 0;
    let startedAt: number | null = null;
    const step = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / durationMs);
      const value = Math.round(from + (target - from) * easeOutCubic(progress));
      shownRef.current = value;
      setShown(value);
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs, enabled]);

  return enabled ? shown : target;
}
```

Run: `npx vitest run src/hooks` — Expected: PASS.

- [ ] **Шаг 3: Токены цветов очков**

В `src/theme/tokens.css`:
- в `:root` после блока «Жизни»:

  ```css
  /* Очки: начисление, комбо, штраф */
  --score-gain: var(--accent);
  --score-combo: #e8a23a;
  --score-loss: var(--heart-on);
  ```

- в `[data-theme='dark']` и в `:root:not([data-theme])` внутри media-query, после `--heart-off`:

  ```css
  --score-gain: #6d9cf8;
  --score-combo: #f2b555;
  --score-loss: #ff6a60;
  ```

- [ ] **Шаг 4: Падающий тест счёта в шапке**

В `Header.test.tsx`: `puzzleOneHole` и провайдеры в файле уже есть. Хелпер рендера с доступом к `useGame` — взять тот, что используют соседние тесты этого файла.

```tsx
describe('Header — счёт партии', () => {
  it('показывает 0 в начале партии', () => {
    renderHeaderWithGame(); // существующий хелпер файла; стартует партию easy
    expect(screen.getByTestId('game-score')).toHaveTextContent('0');
  });

  it('после верной цифры счёт набегает до начисленного', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      const apiRef = renderHeaderWithGame();
      act(() => apiRef.current!.inputDigit({ row: 0, col: 0, value: 5 })); // единственная дыра: ×15 = 750
      act(() => vi.advanceTimersByTime(600));
      expect(screen.getByTestId('game-score')).toHaveTextContent('750');
    } finally {
      vi.useRealTimers();
    }
  });
});
```

> Проверить, как в `Header.test.tsx` называется хелпер рендера, и подставить его имя. Если хелпера с `apiRef` нет, добавить по образцу `GameContext.test.tsx`: компонент-проба пишет `useGame()` в ref.

Run: `npx vitest run src/components/header` — Expected: FAIL (`game-score` не найден).

- [ ] **Шаг 5: Реализовать `ScoreDisplay` и вставить в шапку**

```tsx
// src/components/header/ScoreDisplay.tsx
import { useGame } from '../../state/GameContext';
import { useCountUp } from '../../hooks/useCountUp';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { formatPoints } from '../rank/formatPoints';
import styles from './ScoreDisplay.module.css';

const COUNT_UP_MS = 450;

type ScorePulse = 'gain' | 'loss';

const PULSE_CLASSES: Record<ScorePulse, string> = {
  gain: styles.bump,
  loss: styles.hurt,
};

function pulseForDelta(delta: number): ScorePulse {
  return delta < 0 ? 'loss' : 'gain';
}

export default function ScoreDisplay() {
  const { state } = useGame();
  const reducedMotion = usePrefersReducedMotion();
  const shownScore = useCountUp({
    target: state.score,
    durationMs: COUNT_UP_MS,
    enabled: !reducedMotion,
  });

  const event = state.lastScoreEvent;
  const showPulse = event !== null && !reducedMotion;
  const pulseClass = showPulse ? PULSE_CLASSES[pulseForDelta(event.delta)] : '';
  // key по id события перезапускает CSS-анимацию пульса на каждом изменении счёта.
  const pulseKey = event?.id ?? 0;

  return (
    <div className={styles.score}>
      <div className={styles.label}>Очки</div>
      <div key={pulseKey} className={`${styles.value} ${pulseClass}`} data-testid="game-score">
        {formatPoints(shownScore)}
      </div>
    </div>
  );
}
```

```css
/* src/components/header/ScoreDisplay.module.css */
.score {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
}

.label {
  font-size: 12px;
  color: var(--ink-subtle);
}

.value {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.bump {
  animation: bump 450ms ease-out;
}

.hurt {
  animation: hurt 400ms ease-in-out;
}

@keyframes bump {
  0% { transform: scale(1); color: var(--score-gain); }
  40% { transform: scale(1.15); color: var(--score-gain); }
  100% { transform: scale(1); }
}

@keyframes hurt {
  0%, 100% { transform: translateX(0); color: var(--score-loss); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(2px); color: var(--score-loss); }
}
```

В `Header.tsx` импортировать `ScoreDisplay` и вставить `<ScoreDisplay />` между кнопками `game-back` и `game-settings` в `.topRow`. Раскладка `space-between` сама ставит счёт по центру.

Run: `npx vitest run src/components/header` — Expected: PASS.

- [ ] **Шаг 6: Падающие тесты всплывашки**

```tsx
// src/components/board/ScorePopup.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ScorePopup from './ScorePopup';
import type { ScoreEvent } from '../../state/gameTypes';

afterEach(cleanup);

const NONE = { row: false, col: false, box: false };

function event(overrides: Partial<ScoreEvent>): ScoreEvent {
  return { id: 1, row: 2, col: 4, delta: 150, multiplier: 1, closedUnits: NONE, ...overrides };
}

describe('ScorePopup', () => {
  it('верная цифра — «+150», вид gain', () => {
    render(<ScorePopup event={event({})} />);
    const popup = screen.getByTestId('score-popup');
    expect(popup).toHaveTextContent('+150');
    expect(popup).toHaveAttribute('data-kind', 'gain');
  });

  it('закрытие юнита — «×5» и «+750», вид combo', () => {
    render(<ScorePopup event={event({ delta: 750, multiplier: 5 })} />);
    const popup = screen.getByTestId('score-popup');
    expect(popup).toHaveTextContent('×5');
    expect(popup).toHaveTextContent('+750');
    expect(popup).toHaveAttribute('data-kind', 'combo');
  });

  it('ошибка — «−150», вид loss', () => {
    render(<ScorePopup event={event({ delta: -150 })} />);
    expect(screen.getByTestId('score-popup')).toHaveTextContent('−150');
    expect(screen.getByTestId('score-popup')).toHaveAttribute('data-kind', 'loss');
  });

  it('стоит над своей клеткой', () => {
    render(<ScorePopup event={event({ row: 0, col: 0 })} />);
    expect(screen.getByTestId('score-popup').style.left).toBe(`${(0.5 / 9) * 100}%`);
  });
});
```

В `Board.test.tsx` в набор с базовыми пропсами доски добавить:

```tsx
  it('рисует всплывашку по scoreEvent и не рисует без него', () => {
    const { rerender } = render(<Board {...baseProps} scoreEvent={null} />);
    expect(screen.queryByTestId('score-popup')).toBeNull();
    rerender(
      <Board
        {...baseProps}
        scoreEvent={{ id: 1, row: 0, col: 0, delta: 50, multiplier: 1, closedUnits: { row: false, col: false, box: false } }}
      />,
    );
    expect(screen.getByTestId('score-popup')).toBeInTheDocument();
  });

  it('подсвечивает закрытые юниты', () => {
    render(
      <Board
        {...baseProps}
        scoreEvent={{ id: 1, row: 0, col: 0, delta: 750, multiplier: 10, closedUnits: { row: true, col: false, box: true } }}
      />,
    );
    expect(screen.getAllByTestId(/^closed-unit-/)).toHaveLength(2);
  });
```

> Имя объекта с базовыми пропсами взять из `Board.test.tsx` (если его нет — собрать по первому тесту файла).

Run: `npx vitest run src/components/board` — Expected: FAIL.

- [ ] **Шаг 7: Реализовать `ScorePopup`, `ClosedUnitsFlash` и подключить в `Board`**

```tsx
// src/components/board/ScorePopup.tsx
import { GRID_SIZE } from '../../core';
import type { ScoreEvent } from '../../state/gameTypes';
import { formatPoints } from '../rank/formatPoints';
import styles from './ScorePopup.module.css';

type PopupKind = 'gain' | 'combo' | 'loss';

const POPUP_CLASSES: Record<PopupKind, string> = {
  gain: styles.gain,
  combo: styles.combo,
  loss: styles.loss,
};

function popupKind(event: ScoreEvent): PopupKind {
  if (event.delta < 0) return 'loss';
  if (event.multiplier > 1) return 'combo';
  return 'gain';
}

function formatDelta(delta: number): string {
  if (delta < 0) return `−${formatPoints(-delta)}`;
  return `+${formatPoints(delta)}`;
}

function cellFraction(cells: number): string {
  return `${(cells / GRID_SIZE) * 100}%`;
}

export default function ScorePopup({ event }: { event: ScoreEvent }) {
  const kind = popupKind(event);
  const position = { left: cellFraction(event.col + 0.5), top: cellFraction(event.row) };
  return (
    <div
      className={`${styles.popup} ${POPUP_CLASSES[kind]}`}
      style={position}
      data-testid="score-popup"
      data-kind={kind}
      aria-hidden="true"
    >
      {kind === 'combo' && <span className={styles.multiplier}>×{event.multiplier}</span>}
      <span>{formatDelta(event.delta)}</span>
    </div>
  );
}
```

```tsx
// src/components/board/ClosedUnitsFlash.tsx
import type { CSSProperties } from 'react';
import { BOX_SIZE, GRID_SIZE, getBoxStart } from '../../core';
import type { ScoreEvent } from '../../state/gameTypes';
import type { ClosedUnits } from '../../state/scoring';
import styles from './ScorePopup.module.css';

type UnitName = keyof ClosedUnits;

function cellFraction(cells: number): string {
  return `${(cells / GRID_SIZE) * 100}%`;
}

/** Прямоугольник подсветки для каждого вида юнита — в долях доски. */
const UNIT_AREAS: Record<UnitName, (event: ScoreEvent) => CSSProperties> = {
  row: (event) => ({ top: cellFraction(event.row), left: 0, width: '100%', height: cellFraction(1) }),
  col: (event) => ({ top: 0, left: cellFraction(event.col), width: cellFraction(1), height: '100%' }),
  box: (event) => ({
    top: cellFraction(getBoxStart(event.row)),
    left: cellFraction(getBoxStart(event.col)),
    width: cellFraction(BOX_SIZE),
    height: cellFraction(BOX_SIZE),
  }),
};

const UNIT_NAMES = Object.keys(UNIT_AREAS) as UnitName[];

export default function ClosedUnitsFlash({ event }: { event: ScoreEvent }) {
  const closedUnits = UNIT_NAMES.filter((unit) => event.closedUnits[unit]);
  return (
    <>
      {closedUnits.map((unit) => (
        <div
          key={unit}
          className={styles.flash}
          style={UNIT_AREAS[unit](event)}
          data-testid={`closed-unit-${unit}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
```

```css
/* src/components/board/ScorePopup.module.css */
.popup {
  position: absolute;
  transform: translate(-50%, -30%);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: 700;
  font-size: 16px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 2;
  animation: float-up 900ms ease-out forwards;
}

.gain {
  color: var(--score-gain);
}

.loss {
  color: var(--score-loss);
}

.combo {
  color: var(--score-combo);
  animation-duration: 1200ms;
}

.multiplier {
  font-size: 22px;
  line-height: 1;
}

.flash {
  position: absolute;
  pointer-events: none;
  background: color-mix(in srgb, var(--score-combo) 30%, transparent);
  animation: flash 700ms ease-out forwards;
}

@keyframes float-up {
  0% { opacity: 0; transform: translate(-50%, -10%); }
  15% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -160%); }
}

@keyframes flash {
  0% { opacity: 0; }
  30% { opacity: 1; }
  100% { opacity: 0; }
}
```

`Board.tsx`:
- импорты `Fragment` из `react`, `type ScoreEvent`, `ScorePopup`, `ClosedUnitsFlash`;
- в `BoardProps` добавить:

  ```ts
  /** Последнее изменение счёта — всплывашка над клеткой; null/undefined — не показывать. */
  scoreEvent?: ScoreEvent | null;
  ```

- в деструктуризацию добавить `scoreEvent`;
- после `ROW_INDICES.map(...)`, внутри `.board`:

  ```tsx
      {/* Слой очков идёт ПОСЛЕ 81 клетки — nth-child границ блоков не сдвигается. */}
      {scoreEvent && (
        <Fragment key={scoreEvent.id}>
          <ClosedUnitsFlash event={scoreEvent} />
          <ScorePopup event={scoreEvent} />
        </Fragment>
      )}
  ```

В `Board.module.css` в `.board` добавить `position: relative;`.

`GameScreen.tsx`:
- импортировать `usePrefersReducedMotion`;
- в компоненте:

  ```tsx
  const reducedMotion = usePrefersReducedMotion();
  // При reduced-motion всплывашки не показываем — остаётся только смена числа в шапке.
  const scoreEvent = reducedMotion ? null : game.state.lastScoreEvent;
  ```

- в `<Board>` передать `scoreEvent={scoreEvent}`.

- [ ] **Шаг 8: Весь набор, type-check, lint**

Run: `npm test && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Шаг 9: Коммит**

```bash
git status
git add src/hooks src/theme/tokens.css src/components/header src/components/board src/components/game/GameScreen.tsx
git commit -m "feat: показать счёт в шапке и всплывающие очки над клеткой

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 6: конфетти, `useWinSequence`, экран победы и поражения

**Файлы:**
- Создать:
  - `src/components/confetti/confettiPhysics.ts` + `confettiPhysics.test.ts`
  - `src/components/confetti/useConfetti.ts`, `src/components/confetti/ConfettiCanvas.module.css`
  - `src/components/winscreen/winSequence.ts` + `winSequence.test.ts`
  - `src/components/winscreen/useWinSequence.ts`
  - `src/components/winscreen/WinScore.tsx`, `src/components/winscreen/WinProgress.tsx`
- Изменить:
  - `src/components/winscreen/WinScreen.tsx`, `WinScreen.module.css`, `WinScreen.test.tsx` (только новые тесты; старые не трогать)
  - `src/components/game/GameScreen.tsx`

**Интерфейсы:**
- Использует:
  - `levelForTotal`, `levelInfo`, `levelUpSegments`, `rankForLevel`, `rankById`, `RankId` (задача 1);
  - `GameApi.completion` (задача 3);
  - `RankBadge`, `formatPoints` (задача 4);
  - `useCountUp`, `usePrefersReducedMotion` (задача 5).
- Отдаёт:
  - `Particle`, `stepParticle`, `particleAlpha`, `isAlive`, `createBurst({ shape, originX, originY, random? })`, `BURST_SHAPES`, `CONFETTI_PALETTE`
  - `useConfetti(): { canvasRef; fire({ shape, originX, originY }) }`
  - `WinView`, `WinStep`, `WinEffect`, `WIN_TIMINGS`, `BAR_TRANSITIONS`
  - `initialWinView(prevTotal)`, `buildWinTimeline({ prevTotal, nextTotal })`, `finalWinView({ prevTotal, timeline })`, `lostWinView(prevTotal)`
  - `useWinSequence({ result, prevTotalScore, nextTotalScore, reducedMotion, onEffect }): { view; skip() }`
  - `interface WinScoreSummary { score; prevTotalScore; nextTotalScore; isNewScoreRecord }`, проп `WinScreenProps.scoreSummary?`

- [ ] **Шаг 1: Падающие тесты физики конфетти**

```ts
// src/components/confetti/confettiPhysics.test.ts
import { describe, it, expect } from 'vitest';
import {
  BURST_SHAPES,
  CONFETTI_PALETTE,
  PARTICLE_LIFETIME_FRAMES,
  createBurst,
  isAlive,
  particleAlpha,
  stepParticle,
  type Particle,
} from './confettiPhysics';

function particle(overrides: Partial<Particle> = {}): Particle {
  return { x: 0, y: 0, vx: 0, vy: 0, rotation: 0, spin: 0.1, width: 6, height: 8, color: '#fff', life: 0, ...overrides };
}

describe('stepParticle', () => {
  it('гравитация 0.18 за кадр', () => {
    const next = stepParticle(particle());
    expect(next.vy).toBeCloseTo(0.18);
    expect(next.y).toBeCloseTo(0.18);
    expect(next.life).toBe(1);
  });

  it('затухание скорости ×0.985', () => {
    expect(stepParticle(particle({ vx: 10 })).vx).toBeCloseTo(9.85);
  });

  it('покачивание sin(life / 8) × 0.6 смещает x', () => {
    const life = 12;
    const next = stepParticle(particle({ life }));
    expect(next.x).toBeCloseTo(Math.sin(life / 8) * 0.6);
  });

  it('вращение накапливается', () => {
    expect(stepParticle(particle({ rotation: 1, spin: 0.2 })).rotation).toBeCloseTo(1.2);
  });

  it('не мутирует исходную частицу', () => {
    const original = particle();
    stepParticle(original);
    expect(original.life).toBe(0);
  });
});

describe('жизнь частицы', () => {
  it('alpha угасает линейно к концу жизни', () => {
    expect(particleAlpha(particle({ life: 0 }))).toBe(1);
    expect(particleAlpha(particle({ life: PARTICLE_LIFETIME_FRAMES / 2 }))).toBeCloseTo(0.5);
  });

  it('живёт 260 кадров', () => {
    expect(isAlive(particle({ life: 259 }))).toBe(true);
    expect(isAlive(particle({ life: 260 }))).toBe(false);
  });
});

describe('createBurst', () => {
  const middle = () => 0.5;

  it('залп победы: 45 частиц из точки старта под −60°', () => {
    const burst = createBurst({ shape: BURST_SHAPES.winLeft, originX: 0, originY: 800, random: middle });
    expect(burst).toHaveLength(45);
    expect(burst.every((item) => item.x === 0 && item.y === 800)).toBe(true);
    // скорость 15 (середина 12–18), угол −60°
    expect(burst[0].vx).toBeCloseTo(7.5);
    expect(burst[0].vy).toBeCloseTo(-15 * Math.sin(Math.PI / 3));
  });

  it('размеры 5–10 px и цвета из палитры', () => {
    const burst = createBurst({ shape: BURST_SHAPES.rankUp, originX: 10, originY: 10 });
    expect(burst).toHaveLength(70);
    for (const item of burst) {
      expect(item.width).toBeGreaterThanOrEqual(5);
      expect(item.width).toBeLessThanOrEqual(10);
      expect(CONFETTI_PALETTE).toContain(item.color);
    }
  });

  it('залп уровня — 30 частиц', () => {
    expect(createBurst({ shape: BURST_SHAPES.levelUp, originX: 0, originY: 0 })).toHaveLength(30);
  });
});
```

Run: `npx vitest run src/components/confetti` — Expected: FAIL.

- [ ] **Шаг 2: Реализовать `confettiPhysics.ts`**

```ts
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  width: number;
  height: number;
  color: string;
  life: number;
}

export const CONFETTI_PALETTE = [
  '#2f6fed',
  '#37b26b',
  '#e8a23a',
  '#e05a5a',
  '#7b5cf0',
  '#12a4b6',
  '#f5c542',
] as const;

export const PARTICLE_LIFETIME_FRAMES = 260;
const GRAVITY = 0.18;
const AIR_DRAG = 0.985;
const WOBBLE_AMPLITUDE = 0.6;
const WOBBLE_PERIOD_FRAMES = 8;
const MIN_SIDE_PX = 5;
const SIDE_SPREAD_PX = 5;
const MAX_SPIN = 0.3;

/** Один кадр физики: затухание, гравитация, покачивание, вращение. Чистая функция. */
export function stepParticle(particle: Particle): Particle {
  const vx = particle.vx * AIR_DRAG;
  const vy = particle.vy * AIR_DRAG + GRAVITY;
  const wobble = Math.sin(particle.life / WOBBLE_PERIOD_FRAMES) * WOBBLE_AMPLITUDE;
  return {
    ...particle,
    vx,
    vy,
    x: particle.x + vx + wobble,
    y: particle.y + vy,
    rotation: particle.rotation + particle.spin,
    life: particle.life + 1,
  };
}

export function particleAlpha(particle: Particle): number {
  return Math.max(0, 1 - particle.life / PARTICLE_LIFETIME_FRAMES);
}

export function isAlive(particle: Particle): boolean {
  return particle.life < PARTICLE_LIFETIME_FRAMES;
}

export interface BurstShape {
  count: number;
  /** Направление залпа, рад; −π/2 — строго вверх (ось y экрана направлена вниз). */
  angle: number;
  /** Полный разброс угла, рад. */
  spread: number;
  minSpeed: number;
  maxSpeed: number;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

const STRAIGHT_UP = -Math.PI / 2;
const WIN_SPREAD = 0.5;

/** Параметры залпов из макета. «Мощность» P → скорость от P/2 до P. */
export const BURST_SHAPES = {
  winLeft: { count: 45, angle: degreesToRadians(-60), spread: WIN_SPREAD, minSpeed: 12, maxSpeed: 18 },
  winRight: { count: 45, angle: degreesToRadians(-120), spread: WIN_SPREAD, minSpeed: 12, maxSpeed: 18 },
  levelUp: { count: 30, angle: STRAIGHT_UP, spread: 1.6, minSpeed: 3.5, maxSpeed: 7 },
  rankUp: { count: 70, angle: STRAIGHT_UP, spread: 2.4, minSpeed: 5, maxSpeed: 10 },
} satisfies Record<string, BurstShape>;

interface CreateBurstArgs {
  shape: BurstShape;
  originX: number;
  originY: number;
  /** Источник случайности; подменяется в тестах. */
  random?: () => number;
}

export function createBurst({ shape, originX, originY, random = Math.random }: CreateBurstArgs): Particle[] {
  return Array.from({ length: shape.count }, (_, index) => {
    const angle = shape.angle + (random() - 0.5) * shape.spread;
    const speed = shape.minSpeed + random() * (shape.maxSpeed - shape.minSpeed);
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: random() * Math.PI * 2,
      spin: (random() - 0.5) * MAX_SPIN,
      width: MIN_SIDE_PX + random() * SIDE_SPREAD_PX,
      height: MIN_SIDE_PX + random() * SIDE_SPREAD_PX,
      color: CONFETTI_PALETTE[index % CONFETTI_PALETTE.length],
      life: 0,
    };
  });
}
```

Run: `npx vitest run src/components/confetti` — Expected: PASS.

- [ ] **Шаг 3: Canvas-движок `useConfetti.ts`**

Юнит-теста у движка нет: canvas в jsdom не рисует. Физика покрыта шагом 1, отрисовка проверяется вручную (задача 7).

```ts
import { useCallback, useEffect, useRef } from 'react';
import { createBurst, isAlive, particleAlpha, stepParticle, type BurstShape, type Particle } from './confettiPhysics';

interface FireArgs {
  shape: BurstShape;
  originX: number;
  originY: number;
}

/** Подгоняет буфер canvas под его CSS-размер с учётом плотности пикселей. */
function syncCanvasSize(canvas: HTMLCanvasElement): number {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * pixelRatio);
  const height = Math.round(canvas.clientHeight * pixelRatio);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return pixelRatio;
}

function drawParticle({ context, particle }: { context: CanvasRenderingContext2D; particle: Particle }) {
  context.save();
  context.globalAlpha = particleAlpha(particle);
  context.translate(particle.x, particle.y);
  context.rotate(particle.rotation);
  context.fillStyle = particle.color;
  context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
  context.restore();
}

/** Движок конфетти на одном canvas: частицы живут в ref, цикл rAF крутится, пока они есть. */
export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number | null>(null);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      frameRef.current = null;
      return;
    }
    const pixelRatio = syncCanvasSize(canvas);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    particlesRef.current = particlesRef.current.map(stepParticle).filter(isAlive);
    for (const particle of particlesRef.current) drawParticle({ context, particle });

    const hasParticles = particlesRef.current.length > 0;
    frameRef.current = hasParticles ? requestAnimationFrame(renderFrame) : null;
  }, []);

  const fire = useCallback(
    ({ shape, originX, originY }: FireArgs) => {
      particlesRef.current = [...particlesRef.current, ...createBurst({ shape, originX, originY })];
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(renderFrame);
    },
    [renderFrame],
  );

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return { canvasRef, fire };
}
```

`ConfettiCanvas.module.css`:

```css
.canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 40;
}
```

- [ ] **Шаг 4: Падающие тесты таймлайна `winSequence.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  WIN_TIMINGS,
  buildWinTimeline,
  finalWinView,
  initialWinView,
  lostWinView,
} from './winSequence';

function effectsOf(timeline: ReturnType<typeof buildWinTimeline>) {
  return timeline.flatMap((step) => (step.effect ? [step.effect] : []));
}

describe('initialWinView', () => {
  it('стартует с уровня и доли полоски старого баланса, всё скрыто', () => {
    const view = initialWinView(2500);
    expect(view.level).toBe(1);
    expect(view.rankId).toBe('novice');
    expect(view.barFraction).toBeCloseTo(0.5);
    expect(view.scoreCounting).toBe(false);
    expect(view.progressShown).toBe(false);
    expect(view.finished).toBe(false);
  });
});

describe('buildWinTimeline', () => {
  it('начало: 300 мс до набегания, 1200 мс до pop и залпа победы', () => {
    const timeline = buildWinTimeline({ prevTotal: 0, nextTotal: 750 });
    expect(timeline[0]).toMatchObject({ delayMs: WIN_TIMINGS.startDelayMs, patch: { scoreCounting: true } });
    expect(timeline[1]).toMatchObject({ delayMs: WIN_TIMINGS.countUpMs, effect: 'winBurst' });
  });

  it('без перехода уровня — ни вспышки, ни залпа уровня', () => {
    const timeline = buildWinTimeline({ prevTotal: 1000, nextTotal: 3000 });
    expect(effectsOf(timeline)).toEqual(['winBurst']);
    const view = finalWinView({ prevTotal: 1000, timeline });
    expect(view.level).toBe(1);
    expect(view.barFraction).toBeCloseTo(0.6);
    expect(view.finished).toBe(true);
    expect(view.newRankName).toBeNull();
  });

  it('один переход уровня без смены ранга', () => {
    const timeline = buildWinTimeline({ prevTotal: 4000, nextTotal: 6000 });
    expect(effectsOf(timeline)).toEqual(['winBurst', 'levelBurst']);
    const view = finalWinView({ prevTotal: 4000, timeline });
    expect(view.level).toBe(2);
    expect(view.levelPopCount).toBe(1);
    expect(view.barFraction).toBeCloseTo(0.1);
    expect(view.rankSwapCount).toBe(0);
    expect(view.flash).toBe(false);
  });

  it('переход со сменой ранга: залп ранга и строка нового ранга', () => {
    const timeline = buildWinTimeline({ prevTotal: 14000, nextTotal: 15500 });
    expect(effectsOf(timeline)).toEqual(['winBurst', 'levelBurst', 'rankBurst']);
    const view = finalWinView({ prevTotal: 14000, timeline });
    expect(view.level).toBe(3);
    expect(view.rankId).toBe('apprentice');
    expect(view.rankSwapCount).toBe(1);
    expect(view.newRankName).toBe('Ученик');
  });

  it('два перехода подряд — два pop уровня', () => {
    const view = finalWinView({ prevTotal: 4000, timeline: buildWinTimeline({ prevTotal: 4000, nextTotal: 16500 }) });
    expect(view.level).toBe(3);
    expect(view.levelPopCount).toBe(2);
  });

  it('первый сегмент стартует через 400 мс с медленным переходом, последующие — быстрее', () => {
    const timeline = buildWinTimeline({ prevTotal: 4000, nextTotal: 6000 });
    const barSteps = timeline.filter((step) => step.patch.barTransition !== undefined && step.patch.barTransition !== 'none');
    expect(barSteps[0]).toMatchObject({ delayMs: WIN_TIMINGS.barStartDelayMs, patch: { barTransition: 'first' } });
    expect(barSteps[1].patch.barTransition).toBe('next');
  });
});

describe('lostWinView', () => {
  it('поражение: статичный прогресс по старому балансу, сразу финал', () => {
    const view = lostWinView(89810);
    expect(view.level).toBe(6);
    expect(view.progressShown).toBe(true);
    expect(view.finished).toBe(true);
    expect(view.newRankName).toBeNull();
  });
});
```

Run: `npx vitest run src/components/winscreen/winSequence.test.ts` — Expected: FAIL.

- [ ] **Шаг 5: Реализовать `winSequence.ts`**

```ts
import { levelInfo, levelUpSegments, rankForLevel, type RankId } from '../../state/progress';

export type BarTransition = 'none' | 'first' | 'next';
export type WinEffect = 'winBurst' | 'levelBurst' | 'rankBurst';

/** Всё, что экран победы рисует в данный момент анимации. */
export interface WinView {
  scoreCounting: boolean;
  scorePopped: boolean;
  scoreBadgeShown: boolean;
  timeBadgeShown: boolean;
  progressShown: boolean;
  level: number;
  rankId: RankId;
  barFraction: number;
  barTransition: BarTransition;
  /** Растёт на каждом переходе уровня — ключ перезапуска анимации «pop». */
  levelPopCount: number;
  /** Растёт на каждой смене ранга — ключ перезапуска анимации «swap». */
  rankSwapCount: number;
  flash: boolean;
  newRankName: string | null;
  finished: boolean;
}

/** Шаг таймлайна: через delayMs после предыдущего применить patch и, если есть, эффект. */
export interface WinStep {
  delayMs: number;
  patch: Partial<WinView>;
  effect?: WinEffect;
}

export const WIN_TIMINGS = {
  startDelayMs: 300,
  countUpMs: 1200,
  scoreBadgeDelayMs: 250,
  timeBadgeDelayMs: 150,
  progressDelayMs: 300,
  barStartDelayMs: 400,
  firstSegmentMs: 900,
  nextSegmentMs: 600,
  flashMs: 350,
  rankGlyphSwapAtMs: 280,
  /** Пауза, чтобы браузер отрисовал сброс полоски в 0 до анимации следующего сегмента. */
  barResetGapMs: 50,
} as const;

const BAR_EASING = 'cubic-bezier(.2,.7,.3,1)';

export const BAR_TRANSITIONS: Record<BarTransition, string> = {
  none: 'none',
  first: `width ${WIN_TIMINGS.firstSegmentMs}ms ${BAR_EASING}`,
  next: `width ${WIN_TIMINGS.nextSegmentMs}ms ${BAR_EASING}`,
};

const SEGMENT_DURATIONS: Record<Exclude<BarTransition, 'none'>, number> = {
  first: WIN_TIMINGS.firstSegmentMs,
  next: WIN_TIMINGS.nextSegmentMs,
};

function barFractionOf(total: number): number {
  const info = levelInfo(total);
  return info.pointsIntoLevel / info.pointsForLevel;
}

export function initialWinView(prevTotal: number): WinView {
  const level = levelInfo(prevTotal).level;
  return {
    scoreCounting: false,
    scorePopped: false,
    scoreBadgeShown: false,
    timeBadgeShown: false,
    progressShown: false,
    level,
    rankId: rankForLevel(level).id,
    barFraction: barFractionOf(prevTotal),
    barTransition: 'none',
    levelPopCount: 0,
    rankSwapCount: 0,
    flash: false,
    newRankName: null,
    finished: false,
  };
}

interface LevelUpStepsArgs {
  segmentDurationMs: number;
  reachedLevel: number;
  levelPopCount: number;
  rankSwapCount: number;
}

/** Полоска дошла до 100%: вспышка → новый уровень → (смена ранга). */
function levelUpSteps({ segmentDurationMs, reachedLevel, levelPopCount, rankSwapCount }: LevelUpStepsArgs): WinStep[] {
  const steps: WinStep[] = [
    { delayMs: segmentDurationMs, patch: { flash: true } },
    {
      delayMs: WIN_TIMINGS.flashMs,
      patch: { flash: false, level: reachedLevel, levelPopCount, barFraction: 0, barTransition: 'none' },
      effect: 'levelBurst',
    },
  ];
  const previousRank = rankForLevel(reachedLevel - 1);
  const reachedRank = rankForLevel(reachedLevel);
  if (reachedRank.id === previousRank.id) return steps;

  // Анимация swap стартует вместе с pop уровня, глиф подменяется на её 280-й мс.
  steps.push({ delayMs: 0, patch: { rankSwapCount } });
  steps.push({
    delayMs: WIN_TIMINGS.rankGlyphSwapAtMs,
    patch: { rankId: reachedRank.id, newRankName: reachedRank.name },
    effect: 'rankBurst',
  });
  return steps;
}

interface WinTimelineArgs {
  prevTotal: number;
  nextTotal: number;
}

export function buildWinTimeline({ prevTotal, nextTotal }: WinTimelineArgs): WinStep[] {
  const steps: WinStep[] = [
    { delayMs: WIN_TIMINGS.startDelayMs, patch: { scoreCounting: true } },
    { delayMs: WIN_TIMINGS.countUpMs, patch: { scorePopped: true }, effect: 'winBurst' },
    { delayMs: WIN_TIMINGS.scoreBadgeDelayMs, patch: { scoreBadgeShown: true } },
    { delayMs: WIN_TIMINGS.timeBadgeDelayMs, patch: { timeBadgeShown: true } },
    { delayMs: WIN_TIMINGS.progressDelayMs, patch: { progressShown: true } },
  ];

  const segments = levelUpSegments({ fromTotal: prevTotal, toTotal: nextTotal });
  let rankSwapCount = 0;
  let lastSegmentDurationMs = 0;

  segments.forEach((segment, index) => {
    const isFirstSegment = index === 0;
    const transition: BarTransition = isFirstSegment ? 'first' : 'next';
    const startDelayMs = isFirstSegment ? WIN_TIMINGS.barStartDelayMs : WIN_TIMINGS.barResetGapMs;
    lastSegmentDurationMs = SEGMENT_DURATIONS[transition];

    steps.push({ delayMs: startDelayMs, patch: { barFraction: segment.toFraction, barTransition: transition } });
    if (!segment.completesLevel) return;

    const reachedLevel = segment.level + 1;
    const rankChanges = rankForLevel(reachedLevel).id !== rankForLevel(segment.level).id;
    if (rankChanges) rankSwapCount += 1;
    steps.push(
      ...levelUpSteps({
        segmentDurationMs: lastSegmentDurationMs,
        reachedLevel,
        levelPopCount: index + 1,
        rankSwapCount,
      }),
    );
  });

  steps.push({ delayMs: lastSegmentDurationMs, patch: { finished: true, barTransition: 'none' } });
  return steps;
}

interface FinalWinViewArgs {
  prevTotal: number;
  timeline: WinStep[];
}

/** Итоговое состояние — все шаги, применённые разом (skip и reduced-motion). */
export function finalWinView({ prevTotal, timeline }: FinalWinViewArgs): WinView {
  return timeline.reduce<WinView>((view, step) => ({ ...view, ...step.patch }), initialWinView(prevTotal));
}

/** Поражение: баланс не меняется, прогресс показан сразу и статично. */
export function lostWinView(prevTotal: number): WinView {
  return { ...initialWinView(prevTotal), progressShown: true, finished: true };
}
```

Run: `npx vitest run src/components/winscreen/winSequence.test.ts` — Expected: PASS.

- [ ] **Шаг 6: Хук `useWinSequence.ts`**

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameResult } from '../../state/gameTypes';
import {
  buildWinTimeline,
  finalWinView,
  initialWinView,
  lostWinView,
  type WinEffect,
  type WinView,
} from './winSequence';

interface UseWinSequenceArgs {
  result: GameResult;
  prevTotalScore: number;
  nextTotalScore: number;
  reducedMotion: boolean;
  onEffect(effect: WinEffect): void;
}

/**
 * Проигрывает таймлайн экрана победы. skip() — сразу финал без эффектов.
 * Поражение и reduced-motion — сразу финал.
 */
export function useWinSequence({
  result,
  prevTotalScore,
  nextTotalScore,
  reducedMotion,
  onEffect,
}: UseWinSequenceArgs): { view: WinView; skip(): void } {
  const timeline = useMemo(
    () => buildWinTimeline({ prevTotal: prevTotalScore, nextTotal: nextTotalScore }),
    [prevTotalScore, nextTotalScore],
  );
  const finalView = useMemo(() => {
    if (result === 'lost') return lostWinView(prevTotalScore);
    return finalWinView({ prevTotal: prevTotalScore, timeline });
  }, [result, prevTotalScore, timeline]);

  const animate = result === 'won' && !reducedMotion;
  const [view, setView] = useState<WinView>(() => initialWinView(prevTotalScore));
  const [skipped, setSkipped] = useState(false);
  const timersRef = useRef<number[]>([]);

  const onEffectRef = useRef(onEffect);
  useEffect(() => {
    onEffectRef.current = onEffect;
  }, [onEffect]);

  useEffect(() => {
    if (!animate) return;
    let elapsedMs = 0;
    timersRef.current = timeline.map((step) => {
      elapsedMs += step.delayMs;
      return window.setTimeout(() => {
        setView((current) => ({ ...current, ...step.patch }));
        if (step.effect) onEffectRef.current(step.effect);
      }, elapsedMs);
    });
    return () => timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
  }, [animate, timeline]);

  const skip = useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
    setSkipped(true);
  }, []);

  const showFinal = !animate || skipped;
  return { view: showFinal ? finalView : view, skip };
}
```

- [ ] **Шаг 7: Падающие тесты экрана победы**

В `WinScreen.test.tsx` существующие тесты и `baseProps` не менять. Дописать:

```tsx
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
}

const firstWin = { score: 750, prevTotalScore: 4500, nextTotalScore: 5250, isNewScoreRecord: true };

describe('WinScreen — очки и прогресс', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reduced-motion: сразу итоговые очки, уровень и бейдж рекорда очков', () => {
    stubReducedMotion(true);
    render(<WinScreen {...baseProps} result="won" scoreSummary={firstWin} />);
    expect(screen.getByTestId('win-score')).toHaveTextContent('750');
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 2');
    expect(screen.getByTestId('score-record-badge')).toHaveTextContent('★ Рекорд очков');
  });

  it('тап по карточке — сразу финальное состояние', () => {
    render(<WinScreen {...baseProps} result="won" scoreSummary={firstWin} />);
    fireEvent.click(screen.getByTestId('win-screen-won'));
    expect(screen.getByTestId('win-score')).toHaveTextContent('750');
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 2');
  });

  it('смена ранга: строка «Новый ранг» и новый значок', () => {
    render(
      <WinScreen
        {...baseProps}
        result="won"
        scoreSummary={{ score: 1500, prevTotalScore: 14000, nextTotalScore: 15500, isNewScoreRecord: false }}
      />,
    );
    fireEvent.click(screen.getByTestId('win-screen-won'));
    expect(screen.getByTestId('new-rank')).toHaveTextContent('Новый ранг: Ученик');
    expect(screen.getByTestId('rank-name')).toHaveTextContent('Ученик');
    expect(screen.getByTestId('rank-badge')).toHaveAttribute('data-rank', 'apprentice');
    expect(screen.queryByTestId('score-record-badge')).toBeNull();
  });

  it('без смены ранга строки нового ранга нет', () => {
    render(<WinScreen {...baseProps} result="won" scoreSummary={firstWin} />);
    fireEvent.click(screen.getByTestId('win-screen-won'));
    expect(screen.queryByTestId('new-rank')).toBeNull();
  });

  it('поражение: счёт зачёркнут с подписью, прогресс по старому балансу', () => {
    render(
      <WinScreen
        {...baseProps}
        result="lost"
        scoreSummary={{ score: 900, prevTotalScore: 89810, nextTotalScore: 89810, isNewScoreRecord: false }}
      />,
    );
    expect(screen.getByTestId('win-score-burned')).toHaveTextContent('900');
    expect(screen.getByTestId('win-screen')).toHaveTextContent('Очки сгорают при поражении');
    expect(screen.queryByTestId('win-score')).toBeNull();
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 6');
  });

  it('полная анимация по таймерам доходит до финала', () => {
    vi.useFakeTimers();
    // canvas в jsdom не реализован — getContext отдаёт null, движок просто не рисует.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<WinScreen {...baseProps} result="won" scoreSummary={firstWin} />);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 2');
    expect(screen.getByTestId('win-score')).toHaveTextContent('750');
  });
});
```

В шапку файла добавить импорт `act` из `@testing-library/react`.

Run: `npx vitest run src/components/winscreen` — Expected: FAIL (новые), старые 4 — PASS.

- [ ] **Шаг 8: Блоки `WinScore` и `WinProgress`**

```tsx
// src/components/winscreen/WinScore.tsx
import { formatPoints } from '../rank/formatPoints';
import styles from './WinScreen.module.css';

interface WonScoreProps {
  shownScore: number;
  popped: boolean;
}

export function WonScore({ shownScore, popped }: WonScoreProps) {
  const valueClass = popped ? `${styles.scoreValue} ${styles.scorePop}` : styles.scoreValue;
  return (
    <div className={styles.scoreBlock}>
      <div className={styles.scoreLabel}>Очки за партию</div>
      <div className={valueClass} data-testid="win-score">
        {formatPoints(shownScore)}
      </div>
    </div>
  );
}

export function BurnedScore({ score }: { score: number }) {
  return (
    <div className={styles.scoreBlock}>
      <div className={styles.scoreLabel}>Очки за партию</div>
      <div className={styles.scoreBurned} data-testid="win-score-burned">
        {formatPoints(score)}
      </div>
      <div className={styles.scoreBurnedNote}>Очки сгорают при поражении</div>
    </div>
  );
}
```

```tsx
// src/components/winscreen/WinProgress.tsx
import type { Ref } from 'react';
import { levelInfo, rankById } from '../../state/progress';
import RankBadge from '../rank/RankBadge';
import { formatPoints } from '../rank/formatPoints';
import { BAR_TRANSITIONS, type WinView } from './winSequence';
import styles from './WinScreen.module.css';

const WIN_BADGE_SIZE = 48;

interface WinProgressProps {
  view: WinView;
  nextTotalScore: number;
  badgeRef: Ref<HTMLDivElement>;
  levelRef: Ref<HTMLDivElement>;
}

export default function WinProgress({ view, nextTotalScore, badgeRef, levelRef }: WinProgressProps) {
  const rank = rankById(view.rankId);
  const finalInfo = levelInfo(nextTotalScore);
  const blockClass = view.progressShown ? styles.progress : `${styles.progress} ${styles.hidden}`;
  const badgeClass = view.rankSwapCount > 0 ? styles.rankSwap : undefined;
  const levelClass = view.levelPopCount > 0 ? styles.levelPop : undefined;
  const fillClass = view.flash ? `${styles.barFill} ${styles.barFlash}` : styles.barFill;
  const fillStyle = {
    width: `${view.barFraction * 100}%`,
    transition: BAR_TRANSITIONS[view.barTransition],
  };
  const caption = `${formatPoints(finalInfo.pointsIntoLevel)} / ${formatPoints(finalInfo.pointsForLevel)} до ур. ${finalInfo.level + 1}`;

  return (
    <div className={blockClass} data-testid="win-progress">
      <div className={styles.progressHead}>
        {/* key перезапускает CSS-анимацию на каждом событии */}
        <div key={`badge-${view.rankSwapCount}`} ref={badgeRef} className={badgeClass}>
          <RankBadge rank={rank} size={WIN_BADGE_SIZE} />
        </div>
        <div className={styles.progressTitle}>
          <div key={`level-${view.levelPopCount}`} ref={levelRef} className={levelClass} data-testid="level-number">
            Уровень {view.level}
          </div>
          <div className={styles.progressRank} data-testid="rank-name">
            {rank.name}
          </div>
        </div>
      </div>
      <div className={styles.barTrack}>
        <div className={fillClass} style={fillStyle} />
      </div>
      {view.finished && <div className={styles.progressCaption}>{caption}</div>}
      {view.newRankName && (
        <div className={styles.newRank} data-testid="new-rank">
          Новый ранг: {view.newRankName}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Шаг 9: Собрать `WinScreen.tsx`**

Новые импорты и типы:

```tsx
import { useRef } from 'react';
import { useCountUp } from '../../hooks/useCountUp';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { BURST_SHAPES } from '../confetti/confettiPhysics';
import { useConfetti } from '../confetti/useConfetti';
import confettiStyles from '../confetti/ConfettiCanvas.module.css';
import { useWinSequence } from './useWinSequence';
import { WIN_TIMINGS, type WinEffect } from './winSequence';
import { BurnedScore, WonScore } from './WinScore';
import WinProgress from './WinProgress';

export interface WinScoreSummary {
  score: number;
  prevTotalScore: number;
  nextTotalScore: number;
  isNewScoreRecord: boolean;
}

// Без scoreSummary (старые вызовы и тесты) блоки очков не рисуются.
const EMPTY_SCORE_SUMMARY: WinScoreSummary = {
  score: 0,
  prevTotalScore: 0,
  nextTotalScore: 0,
  isNewScoreRecord: false,
};
```

В `WinScreenProps` добавить `scoreSummary?: WinScoreSummary;`.

Хелпер центра элемента — вне компонента:

```tsx
function centerOf(element: HTMLElement | null): { originX: number; originY: number } | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { originX: rect.left + rect.width / 2, originY: rect.top + rect.height / 2 };
}
```

Тело компонента, до `return`:

```tsx
  const content = CONTENT[result];
  const iconClass = result === 'won' ? styles.iconWon : styles.iconLost;
  const summary = scoreSummary ?? EMPTY_SCORE_SUMMARY;
  const reducedMotion = usePrefersReducedMotion();
  const { canvasRef, fire } = useConfetti();
  const badgeRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);

  const effectHandlers: Record<WinEffect, () => void> = {
    winBurst: () => {
      const bottom = window.innerHeight;
      fire({ shape: BURST_SHAPES.winLeft, originX: 0, originY: bottom });
      fire({ shape: BURST_SHAPES.winRight, originX: window.innerWidth, originY: bottom });
    },
    levelBurst: () => {
      const origin = centerOf(levelRef.current);
      if (origin) fire({ shape: BURST_SHAPES.levelUp, ...origin });
    },
    rankBurst: () => {
      const origin = centerOf(badgeRef.current);
      if (origin) fire({ shape: BURST_SHAPES.rankUp, ...origin });
    },
  };

  const { view, skip } = useWinSequence({
    result,
    prevTotalScore: summary.prevTotalScore,
    nextTotalScore: summary.nextTotalScore,
    reducedMotion,
    onEffect: (effect) => effectHandlers[effect](),
  });

  const countUpTarget = view.scoreCounting || view.finished ? summary.score : 0;
  const shownScore = useCountUp({
    target: countUpTarget,
    durationMs: WIN_TIMINGS.countUpMs,
    enabled: !view.finished,
  });

  const hasScore = scoreSummary !== undefined;
  const showScoreRecord = hasScore && summary.isNewScoreRecord;
  const scoreBadgeClass = view.scoreBadgeShown ? styles.recordBadge : `${styles.recordBadge} ${styles.hidden}`;
  const timeBadgeClass = view.timeBadgeShown ? styles.recordBadge : `${styles.recordBadge} ${styles.hidden}`;
```

JSX. Карточка получает `onClick={skip}`; бейджи всегда в DOM, если заслужены, — видимость через класс. Старый тест бейджа рекорда времени поэтому остаётся зелёным.

```tsx
    <div className={styles.overlay} data-testid="win-screen" role="dialog" aria-modal="true">
      <canvas ref={canvasRef} className={confettiStyles.canvas} aria-hidden="true" />
      <div className={styles.card} data-testid={content.testid} onClick={skip}>
        <div className={iconClass}>{content.icon}</div>
        <div className={styles.title}>{content.title}</div>
        <div className={styles.subtitle}>{content.subtitle}</div>

        {hasScore && result === 'won' && <WonScore shownScore={shownScore} popped={view.scorePopped} />}
        {hasScore && result === 'lost' && <BurnedScore score={summary.score} />}

        <div className={styles.badges}>
          {showScoreRecord && (
            <div className={scoreBadgeClass} data-testid="score-record-badge">
              ★ Рекорд очков
            </div>
          )}
          {isNewRecord && (
            <div className={timeBadgeClass} data-testid="new-record-badge">
              ★ Новый рекорд
            </div>
          )}
        </div>

        {hasScore && (
          <WinProgress
            view={view}
            nextTotalScore={summary.nextTotalScore}
            badgeRef={badgeRef}
            levelRef={levelRef}
          />
        )}

        {/* .stats и кнопки — без изменений */}
      </div>
    </div>
```

> `isNewScoreRecord` для поражения всегда `false` (`summarizeCompletion`), отдельная проверка результата не нужна.
>
> Бейдж времени при `timeBadgeShown = false` на старте получает класс `.hidden`. Это только `opacity`, элемент в DOM, поэтому старый тест `toBeInTheDocument` проходит.

- [ ] **Шаг 10: Стили экрана победы**

В `WinScreen.module.css`: у `.recordBadge` убрать `margin-top: 16px`, его заменяет обёртка `.badges`. Добавить:

```css
.badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}

.badges:empty {
  display: none;
}

.hidden {
  opacity: 0;
}

.recordBadge,
.progress {
  transition: opacity 250ms ease-out;
}

.scoreBlock {
  margin-top: 18px;
}

.scoreLabel {
  font-size: 12px;
  color: var(--ink-subtle);
}

.scoreValue,
.scoreBurned {
  font-size: 40px;
  font-weight: 800;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.scorePop {
  animation: pop 350ms ease-out;
}

.scoreBurned {
  color: var(--ink-faint);
  text-decoration: line-through;
}

.scoreBurnedNote {
  font-size: 12px;
  color: var(--score-loss);
  margin-top: 2px;
}

.progress {
  width: 100%;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  padding: 16px;
  margin-top: 18px;
  box-shadow: var(--shadow-card);
  text-align: left;
}

.progressHead {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progressTitle {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.progressRank {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-subtle);
}

.barTrack {
  height: 8px;
  border-radius: 4px;
  background: var(--divider);
  margin-top: 12px;
  overflow: hidden;
}

.barFill {
  height: 100%;
  border-radius: 4px;
  background: var(--accent);
}

.barFlash {
  animation: bar-flash 350ms ease-out;
}

.progressCaption {
  font-size: 12px;
  color: var(--ink-subtle);
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}

.newRank {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--score-combo);
}

.levelPop {
  display: inline-block;
  animation: pop 350ms ease-out;
}

.rankSwap {
  animation: rank-swap 700ms ease-in-out;
}

@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

@keyframes bar-flash {
  0% { filter: brightness(1); }
  40% { filter: brightness(1.8); box-shadow: 0 0 12px var(--accent); }
  100% { filter: brightness(1); }
}

/* Глиф подменяется на 280-й мс (40% от 700) — в момент минимального масштаба. */
@keyframes rank-swap {
  0% { transform: scale(1); filter: drop-shadow(0 0 0 transparent); }
  40% { transform: scale(0.6); }
  70% { transform: scale(1.2); filter: drop-shadow(0 0 10px #fff); }
  100% { transform: scale(1); filter: drop-shadow(0 0 0 transparent); }
}
```

- [ ] **Шаг 11: Подключить в `GameScreen.tsx`**

До `return`:

```tsx
  const scoreSummary = {
    score: game.state.score,
    prevTotalScore: game.completion.prevTotalScore,
    nextTotalScore: game.completion.nextTotalScore,
    isNewScoreRecord: game.completion.isNewScoreRecord,
  };
  // Итоги считаются в эффекте после перехода в completed, поэтому первый кадр WinScreen видит
  // NO_COMPLETION. Ключ пересоздаёт экран, когда итоги приходят, — анимация стартует с верного баланса.
  const winScreenKey = `${scoreSummary.prevTotalScore}:${scoreSummary.nextTotalScore}`;
```

В `<WinScreen>` добавить `key={winScreenKey}` и `scoreSummary={scoreSummary}`.

- [ ] **Шаг 12: Тесты, type-check, lint**

Run: `npx vitest run src/components/winscreen src/components/confetti && npm test && npm run type-check && npm run lint`
Expected:
- PASS, включая 4 старых теста `WinScreen.test.tsx` без изменений.
- Если `react-hooks`-правила ругаются на `effectHandlers` (объект пересоздаётся на каждый рендер), это нормально: `useWinSequence` держит `onEffect` в ref. Правило не подавлять вслепую — сначала прочитать сообщение.

- [ ] **Шаг 13: Коммит**

```bash
git status
git add src/components/confetti src/components/winscreen src/components/game/GameScreen.tsx
git commit -m "feat: анимировать экран победы — набегающий счёт, прогресс уровня, конфетти

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 7: ручная проверка, трекинг, версия 0.2.0

**Файлы:**
- Изменить: `docs/roadmap.md`, `package.json`, `CHANGELOG.md`

- [ ] **Шаг 1: Полная автоматическая проверка**

Run: `npm test && npm run type-check && npm run lint && npm run build`
Expected: всё зелёное, сборка проходит. Если что-то падает, показать вывод и чинить до перехода дальше.

- [ ] **Шаг 2: Ручной прогон в браузере (скилл `run`)**

Перед запуском спросить пользователя, удобно ли сейчас (правило «сначала спросить перед тяжёлой проверкой»). Чек-лист, пройти в обеих темах:

1. Шапка:
   - счёт по центру между `‹` и `⚙`;
   - при верной цифре счёт набегает и пульсирует;
   - при ошибке — покачивание красным.
2. Всплывашки:
   - синее «+N» над клеткой;
   - при закрытии линии — оранжевое «×5» и «+N», клетки линии коротко подсвечены;
   - при ошибке — красное «−N»;
   - повторная постановка стёртой верной цифры — без всплывашки.
3. Экран победы, обычная победа:
   - счёт набегает, затем pop и два залпа конфетти;
   - появляются бейджи;
   - полоска заполняется.
4. Экран победы с переходом уровня и ранга. Проще всего подложить в IndexedDB запись с `score`, чтобы баланс был около 14 000:
   - вспышка;
   - pop номера уровня и малый залп конфетти;
   - смена значка, большой залп, строка «Новый ранг».
5. Тап по карточке во время анимации — сразу финал.
6. Поражение:
   - счёт зачёркнут, подпись «Очки сгорают при поражении»;
   - конфетти нет.
7. Главный экран и статистика: карточка профиля, переход по тапу, рекорды очков в строках сложностей.
8. `prefers-reduced-motion: reduce` (DevTools → Rendering):
   - нет всплывашек, набегания и конфетти;
   - экран победы сразу финальный.
9. Перезагрузка посреди партии: счёт сохранился, всплывашка не проигралась повторно.
10. Сброс статистики:
    - уровень снова 1, Новичок;
    - подпись под кнопкой видна.

Найденные дефекты записать и чинить отдельными коммитами `fix:` до перехода к шагу 3.

- [ ] **Шаг 3: Роадмап — `✅ готово`**

В строке «Очки игрока, уровни и ранги» (`docs/roadmap.md`):
- статус → `✅ готово`;
- «Завершено» → дата окончания (ISO);
- в «Заметки» перед ссылкой на ADR дописать `v0.2.0. `.

- [ ] **Шаг 4: Версия и CHANGELOG**

В `package.json`: `"version": "0.2.0"`.

В `CHANGELOG.md` над `## [0.1.3]`:

```markdown
## [0.2.0] — <дата завершения>

### Добавлено

- Очки за партию: каждая верная цифра приносит очки — чем быстрее вводите, тем больше. Закрытая
  строка, столбец или квадрат умножают очки (до ×15). Ошибка отнимает очки
- Счёт партии в шапке игры и всплывающие «+очки» над клеткой
- Уровни и ранги: очки побед копятся между партиями, растёт уровень, а с ним ранг — от «Новичка»
  до «Гроссмейстера», у каждого свой значок
- Карточка уровня на главном экране и в статистике; рекорд очков на каждой сложности
- Праздничный экран победы: набегающий счёт, заполнение полоски уровня и конфетти.
  Тап по экрану пропускает анимацию, при системной настройке «уменьшить движение» анимаций нет

### Изменено

- Очки проигранной или брошенной партии сгорают
- «Сбросить статистику» теперь сбрасывает и очки, уровень, ранг
- Партия, начатая до обновления, продолжается: очки начнут считаться с текущего хода
```

Run: `node scripts/check-version.mjs main`
Expected: проверка проходит (0.2.0 > 0.1.3).

- [ ] **Шаг 5: Коммит версии**

```bash
git status
git add docs/roadmap.md package.json CHANGELOG.md
git commit -m "chore: версия 0.2.0

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

После коммита — скилл `superpowers:finishing-a-development-branch`. Пушить и открывать PR только с согласия пользователя. Локальный `main` на 9 коммитов впереди `origin/main` — ничего с этим не делать.
