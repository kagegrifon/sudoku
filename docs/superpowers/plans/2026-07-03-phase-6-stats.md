# Phase 6 — Статистика по периодам · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Записывать каждую завершённую партию (won/lost/abandoned) в IndexedDB и показывать агрегированную статистику по периодам (День/Неделя/Месяц/Всё) с разбивкой по сложности.

**Architecture:** Три изолированных слоя. `storage/historyDb.ts` — тонкая обёртка над `idb` (только чтение/запись `CompletedGame`, без бизнес-логики). `statsService.ts` — чистые функции агрегации над `CompletedGame[]` (не знают про IndexedDB, тестируются без моков БД, `now` передаётся параметром). Запись `CompletedGame` — side-effect в `GameProvider`: `useEffect` на переход `status → 'completed'` (won/lost) и явный вызов в `newGame()` перед `dispatch` (abandoned). `StatsView` грузит журнал через `useEffect` при монтировании и рендерит метрики; переключение вида — `activeView` в `AppContext`, тумблер в `Header`.

**Tech Stack:** TypeScript, React 18, `idb` (IndexedDB), Vitest (+ `fake-indexeddb` для тестов БД), CSS Modules.

## Global Constraints

- **Стек:** TypeScript + Vite, React 18, CSS Modules, Vitest. `core/` без React/DOM.
- **Слои:** `components → state → core`; `statsService` не обращается к `idb` напрямую.
- **Reducer остаётся чистым** — запись в IndexedDB это side-effect, делается в `GameProvider`, не в reducer.
- **Читаемость (CLAUDE.md):** без вложенных тернарников; описательные имена (никаких `s`, `p`, `mod`); options-объект при 3+ параметрах / при 2 параметрах одного типа / при boolean-параметре; flat JSX (логика над `return`); `Record`/`Map`/`Set` вместо `if`/`switch`-цепочек.
- **Тесты БД:** vitest использует `environment: 'node'` глобально; тестам с DOM/IndexedDB нужен докблок `// @vitest-environment jsdom` первой строкой. Импорт `fake-indexeddb/auto` в тесте подменяет глобальный `indexedDB`.
- **E2E-селекторы (если добавляются):** только `data-testid`.
- **Git:** ветка `feat/phase-6-stats` (уже создана, не `main`); коммит на задачу; сообщения `<type>: <описание> (Phase 6)`, описание — русский императив.
- **Тип `CompletedGame`** (design-doc §2) — источник истины:
  ```ts
  interface CompletedGame {
    id: string;
    difficulty: Difficulty;          // 'easy' | 'medium' | 'hard' из core
    durationSeconds: number;
    completedAt: string;             // ISO
    outcome: 'won' | 'lost' | 'abandoned';
  }
  ```
- **Метрики (design-doc §2-3):** `completedCount` = число `outcome==='won'`; `bestTimeSeconds`/`averageTimeSeconds` — только по `won`; `completionRate = won / (won + lost + abandoned)`; `favoriteDifficulty` — самая частая `difficulty` среди **всех** записей периода. Tie-break `favoriteDifficulty`: при равенстве count — порядок `easy → medium → hard` (детерминированно).
- **Периоды:** `'day' | 'week' | 'month' | 'all'`. `filterByPeriod(games, period, now)` принимает `now: Date` параметром (не `new Date()` внутри) — для детерминизма тестов.
- **`durationSeconds` для abandoned** = `elapsedSeconds` в момент броска (согласуется с won/lost).

---

## Структура файлов

| Файл | Ответственность | Задача |
|---|---|---|
| `package.json` | +`idb` (dep), +`fake-indexeddb` (devDep) | 1 |
| `src/state/storage/historyDb.ts` | Обёртка над `idb`: `recordCompletedGame`, `getAllCompletedGames`, тип `CompletedGame` | 2 |
| `src/state/storage/historyDb.test.ts` | Тесты БД (fake-indexeddb, jsdom) | 2 |
| `src/state/statsService.ts` | Чистые функции: `filterByPeriod`, `computeStats`, типы `StatsPeriod`, `PeriodStats`, `DifficultyStats` | 3 |
| `src/state/statsService.test.ts` | Тесты агрегации (node, фиксированный `now`) | 3 |
| `src/state/GameContext.tsx` | Интеграция записи won/lost (useEffect) и abandoned (в `newGame`) | 4 |
| `src/state/GameContext.test.tsx` | Тесты записи трёх исходов (моки historyDb) | 4 |
| `src/components/stats/StatsView.tsx` | Экран статистики: загрузка журнала, переключатель периода, метрики | 5 |
| `src/components/stats/StatsView.module.css` | Стили экрана статистики | 5 |
| `src/components/stats/StatsView.test.tsx` | Тесты рендера/переключения (jsdom, моки historyDb) | 5 |
| `src/components/header/Header.tsx` | Кнопка-тумблер переключения вида (`toggle-stats`) | 6 |
| `src/components/header/Header.test.tsx` | Тест тумблера (jsdom) | 6 |
| `src/App.tsx` | Рендер `GameScreen` или `StatsView` по `activeView` | 6 |

---

## Task 1: Установить зависимости `idb` и `fake-indexeddb`

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: —
- Produces: рантайм-пакет `idb` (для Task 2), devDep `fake-indexeddb` (для тестов Task 2).

- [ ] **Step 1: Установить `idb` как runtime-зависимость**

Run:
```bash
npm install idb
```
Expected: `package.json` → `dependencies` содержит `"idb": "^8.x"`; `package-lock.json` обновлён.

- [ ] **Step 2: Установить `fake-indexeddb` как dev-зависимость**

Run:
```bash
npm install -D fake-indexeddb
```
Expected: `package.json` → `devDependencies` содержит `"fake-indexeddb": "^6.x"`.

- [ ] **Step 3: Проверить, что проект собирается**

Run:
```bash
npm run type-check
```
Expected: PASS (нет ошибок типов; новые пакеты не сломали сборку).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: Добавить idb и fake-indexeddb (Phase 6)"
```

---

## Task 2: `historyDb.ts` — обёртка над IndexedDB

**Files:**
- Create: `src/state/storage/historyDb.ts`
- Test: `src/state/storage/historyDb.test.ts`

**Interfaces:**
- Consumes: `Difficulty` из `../../core`.
- Produces:
  ```ts
  interface CompletedGame {
    id: string;
    difficulty: Difficulty;
    durationSeconds: number;
    completedAt: string;   // ISO
    outcome: 'won' | 'lost' | 'abandoned';
  }
  function recordCompletedGame(game: Omit<CompletedGame, 'id'>): Promise<void>;
  function getAllCompletedGames(): Promise<CompletedGame[]>;
  ```
  (используются в Task 3 — тип, Task 4 — `recordCompletedGame`, Task 5 — `getAllCompletedGames`)

- [ ] **Step 1: Написать падающий тест**

Создать `src/state/storage/historyDb.test.ts`:
```ts
// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { recordCompletedGame, getAllCompletedGames } from './historyDb';

// Каждый тест — чистая БД: сбрасываем глобальный indexedDB.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('historyDb', () => {
  it('пустой журнал даёт пустой массив', async () => {
    expect(await getAllCompletedGames()).toEqual([]);
  });

  it('записанная партия читается обратно с присвоенным id', async () => {
    await recordCompletedGame({
      difficulty: 'easy',
      durationSeconds: 120,
      completedAt: '2026-07-03T10:00:00.000Z',
      outcome: 'won',
    });
    const games = await getAllCompletedGames();
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      difficulty: 'easy',
      durationSeconds: 120,
      completedAt: '2026-07-03T10:00:00.000Z',
      outcome: 'won',
    });
    expect(typeof games[0].id).toBe('string');
    expect(games[0].id.length).toBeGreaterThan(0);
  });

  it('несколько партий возвращаются отсортированными по completedAt (возр.)', async () => {
    await recordCompletedGame({
      difficulty: 'hard',
      durationSeconds: 300,
      completedAt: '2026-07-03T12:00:00.000Z',
      outcome: 'lost',
    });
    await recordCompletedGame({
      difficulty: 'medium',
      durationSeconds: 200,
      completedAt: '2026-07-03T09:00:00.000Z',
      outcome: 'abandoned',
    });
    const games = await getAllCompletedGames();
    expect(games.map((game) => game.completedAt)).toEqual([
      '2026-07-03T09:00:00.000Z',
      '2026-07-03T12:00:00.000Z',
    ]);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run:
```bash
npx vitest run src/state/storage/historyDb.test.ts
```
Expected: FAIL — `Failed to resolve import "./historyDb"` (файла ещё нет).

- [ ] **Step 3: Реализовать `historyDb.ts`**

Создать `src/state/storage/historyDb.ts`:
```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Difficulty } from '../../core';

export type GameOutcome = 'won' | 'lost' | 'abandoned';

export interface CompletedGame {
  id: string;
  difficulty: Difficulty;
  durationSeconds: number;
  completedAt: string; // ISO
  outcome: GameOutcome;
}

const DB_NAME = 'sudoku-history';
const DB_VERSION = 1;
const STORE_NAME = 'games';
const COMPLETED_AT_INDEX = 'by-completedAt';

interface HistorySchema extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: CompletedGame;
    indexes: { [COMPLETED_AT_INDEX]: string };
  };
}

// Промис БД пересоздаётся, если тест подменил глобальный indexedDB.
let dbPromise: Promise<IDBPDatabase<HistorySchema>> | null = null;
let dbFactory: IDBFactory | null = null;

function getDb(): Promise<IDBPDatabase<HistorySchema>> {
  if (dbPromise === null || dbFactory !== globalThis.indexedDB) {
    dbFactory = globalThis.indexedDB;
    dbPromise = openDB<HistorySchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex(COMPLETED_AT_INDEX, 'completedAt');
      },
    });
  }
  return dbPromise;
}

export async function recordCompletedGame(game: Omit<CompletedGame, 'id'>): Promise<void> {
  try {
    const db = await getDb();
    const record: CompletedGame = { ...game, id: crypto.randomUUID() };
    await db.put(STORE_NAME, record);
  } catch {
    // Журнал недоступен — статистика просто не пополнится, игра не ломается.
  }
}

export async function getAllCompletedGames(): Promise<CompletedGame[]> {
  try {
    const db = await getDb();
    return await db.getAllFromIndex(STORE_NAME, COMPLETED_AT_INDEX);
  } catch {
    return [];
  }
}
```

> Примечание для реализатора: `getAllFromIndex` по индексу `completedAt` возвращает записи, отсортированные по значению индекса (ISO-строки сортируются лексикографически = хронологически), поэтому явная сортировка не нужна. `dbFactory !== globalThis.indexedDB` сбрасывает кэш соединения, когда тест заменил `indexedDB` на свежий `IDBFactory` (иначе второй тест открыл бы закрытую БД).

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run:
```bash
npx vitest run src/state/storage/historyDb.test.ts
```
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add src/state/storage/historyDb.ts src/state/storage/historyDb.test.ts
git commit -m "feat: historyDb — журнал завершённых партий в IndexedDB (Phase 6)"
```

---

## Task 3: `statsService.ts` — чистая агрегация по периодам

**Files:**
- Create: `src/state/statsService.ts`
- Test: `src/state/statsService.test.ts`

**Interfaces:**
- Consumes: `CompletedGame`, `GameOutcome` из `./storage/historyDb`; `Difficulty` из `../core`.
- Produces:
  ```ts
  type StatsPeriod = 'day' | 'week' | 'month' | 'all';
  interface DifficultyStats {
    completedCount: number;              // won
    bestTimeSeconds: number | null;      // по won; null если нет won
    averageTimeSeconds: number | null;   // по won; null если нет won
  }
  interface PeriodStats {
    total: DifficultyStats;                        // общее (все сложности)
    byDifficulty: Record<Difficulty, DifficultyStats>;
    completionRate: number;                        // won / (won+lost+abandoned); 0 если нет записей
    favoriteDifficulty: Difficulty | null;         // самая частая среди всех записей; null если период пуст
  }
  function filterByPeriod(games: CompletedGame[], period: StatsPeriod, now: Date): CompletedGame[];
  function computeStats(games: CompletedGame[]): PeriodStats;   // games уже отфильтрованы по периоду
  ```
  (используются в Task 5)

- [ ] **Step 1: Написать падающий тест**

Создать `src/state/statsService.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../core';
import type { CompletedGame } from './storage/historyDb';
import { filterByPeriod, computeStats, type StatsPeriod } from './statsService';

// Фиксированный «сейчас» — детерминизм. Пятница.
const NOW = new Date('2026-07-03T12:00:00.000Z');

let idCounter = 0;
function game(overrides: Partial<CompletedGame>): CompletedGame {
  idCounter += 1;
  return {
    id: `g${idCounter}`,
    difficulty: 'easy',
    durationSeconds: 100,
    completedAt: NOW.toISOString(),
    outcome: 'won',
    ...overrides,
  };
}

function isoMinutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}
function isoDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60_000).toISOString();
}

describe('filterByPeriod', () => {
  it('период all возвращает все записи', () => {
    const games = [game({ completedAt: isoDaysAgo(400) }), game({})];
    expect(filterByPeriod(games, 'all', NOW)).toHaveLength(2);
  });

  it('day оставляет только записи за последние 24 часа', () => {
    const recent = game({ completedAt: isoMinutesAgo(60) });
    const old = game({ completedAt: isoDaysAgo(2) });
    const result = filterByPeriod([recent, old], 'day', NOW);
    expect(result).toEqual([recent]);
  });

  it('сегодняшняя запись попадает и в day, и в week одновременно', () => {
    const today = game({ completedAt: isoMinutesAgo(30) });
    expect(filterByPeriod([today], 'day', NOW)).toEqual([today]);
    expect(filterByPeriod([today], 'week', NOW)).toEqual([today]);
    expect(filterByPeriod([today], 'month', NOW)).toEqual([today]);
  });

  it('week оставляет последние 7 дней, month — последние 30', () => {
    const fiveDays = game({ completedAt: isoDaysAgo(5) });
    const tenDays = game({ completedAt: isoDaysAgo(10) });
    const fortyDays = game({ completedAt: isoDaysAgo(40) });
    const all = [fiveDays, tenDays, fortyDays];
    expect(filterByPeriod(all, 'week', NOW)).toEqual([fiveDays]);
    expect(filterByPeriod(all, 'month', NOW)).toEqual([fiveDays, tenDays]);
  });
});

describe('computeStats — completionRate', () => {
  it('пустой журнал: rate 0, favoriteDifficulty null, времена null', () => {
    const stats = computeStats([]);
    expect(stats.completionRate).toBe(0);
    expect(stats.favoriteDifficulty).toBeNull();
    expect(stats.total.completedCount).toBe(0);
    expect(stats.total.bestTimeSeconds).toBeNull();
    expect(stats.total.averageTimeSeconds).toBeNull();
  });

  it('rate = won / (won + lost + abandoned)', () => {
    const games = [
      game({ outcome: 'won' }),
      game({ outcome: 'won' }),
      game({ outcome: 'lost' }),
      game({ outcome: 'abandoned' }),
    ];
    // 2 won из 4 всего
    expect(computeStats(games).completionRate).toBeCloseTo(0.5, 5);
  });
});

describe('computeStats — времена по won', () => {
  it('best/average считаются только по выигранным', () => {
    const games = [
      game({ outcome: 'won', durationSeconds: 100 }),
      game({ outcome: 'won', durationSeconds: 300 }),
      game({ outcome: 'lost', durationSeconds: 10 }), // игнор для времени
    ];
    const total = computeStats(games).total;
    expect(total.completedCount).toBe(2);
    expect(total.bestTimeSeconds).toBe(100);
    expect(total.averageTimeSeconds).toBe(200);
  });

  it('разбивка по сложности независима', () => {
    const games = [
      game({ difficulty: 'easy', outcome: 'won', durationSeconds: 50 }),
      game({ difficulty: 'hard', outcome: 'won', durationSeconds: 400 }),
      game({ difficulty: 'hard', outcome: 'won', durationSeconds: 200 }),
    ];
    const { byDifficulty } = computeStats(games);
    expect(byDifficulty.easy.completedCount).toBe(1);
    expect(byDifficulty.easy.bestTimeSeconds).toBe(50);
    expect(byDifficulty.medium.completedCount).toBe(0);
    expect(byDifficulty.medium.bestTimeSeconds).toBeNull();
    expect(byDifficulty.hard.completedCount).toBe(2);
    expect(byDifficulty.hard.bestTimeSeconds).toBe(200);
    expect(byDifficulty.hard.averageTimeSeconds).toBe(300);
  });
});

describe('computeStats — favoriteDifficulty', () => {
  it('самая частая сложность среди всех записей (включая lost/abandoned)', () => {
    const games = [
      game({ difficulty: 'hard', outcome: 'lost' }),
      game({ difficulty: 'hard', outcome: 'abandoned' }),
      game({ difficulty: 'easy', outcome: 'won' }),
    ];
    expect(computeStats(games).favoriteDifficulty).toBe('hard');
  });

  it('при равенстве count tie-break: easy < medium < hard', () => {
    const games = [
      game({ difficulty: 'medium', outcome: 'won' }),
      game({ difficulty: 'easy', outcome: 'won' }),
    ];
    // по одной — побеждает easy как более ранняя в порядке
    expect(computeStats(games).favoriteDifficulty).toBe('easy');

    const games2 = [
      game({ difficulty: 'hard', outcome: 'won' }),
      game({ difficulty: 'medium', outcome: 'won' }),
    ];
    expect(computeStats(games2).favoriteDifficulty).toBe('medium');
  });
});

// Проверка, что StatsPeriod-тип покрывает ровно 4 значения (документирующий тест).
it('StatsPeriod включает day/week/month/all', () => {
  const periods: StatsPeriod[] = ['day', 'week', 'month', 'all'];
  expect(periods).toHaveLength(4);
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run:
```bash
npx vitest run src/state/statsService.test.ts
```
Expected: FAIL — `Failed to resolve import "./statsService"`.

- [ ] **Step 3: Реализовать `statsService.ts`**

Создать `src/state/statsService.ts`:
```ts
import type { Difficulty } from '../core';
import type { CompletedGame } from './storage/historyDb';

export type StatsPeriod = 'day' | 'week' | 'month' | 'all';

export interface DifficultyStats {
  completedCount: number; // число выигранных партий
  bestTimeSeconds: number | null; // по won; null если выигранных нет
  averageTimeSeconds: number | null; // по won; null если выигранных нет
}

export interface PeriodStats {
  total: DifficultyStats;
  byDifficulty: Record<Difficulty, DifficultyStats>;
  completionRate: number; // won / (won + lost + abandoned); 0 если записей нет
  favoriteDifficulty: Difficulty | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Сколько дней назад отсчитывать порог для каждого периода; 'all' — без порога.
const PERIOD_WINDOW_DAYS: Record<Exclude<StatsPeriod, 'all'>, number> = {
  day: 1,
  week: 7,
  month: 30,
};

// Порядок сложностей задаёт tie-break для favoriteDifficulty.
const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

export function filterByPeriod(
  games: CompletedGame[],
  period: StatsPeriod,
  now: Date,
): CompletedGame[] {
  if (period === 'all') return games;
  const thresholdMs = now.getTime() - PERIOD_WINDOW_DAYS[period] * DAY_MS;
  return games.filter((game) => new Date(game.completedAt).getTime() >= thresholdMs);
}

function statsFromWins(wins: CompletedGame[]): DifficultyStats {
  if (wins.length === 0) {
    return { completedCount: 0, bestTimeSeconds: null, averageTimeSeconds: null };
  }
  const durations = wins.map((game) => game.durationSeconds);
  const totalDuration = durations.reduce((sum, seconds) => sum + seconds, 0);
  return {
    completedCount: wins.length,
    bestTimeSeconds: Math.min(...durations),
    averageTimeSeconds: Math.round(totalDuration / wins.length),
  };
}

function emptyByDifficulty(): Record<Difficulty, DifficultyStats> {
  const empty: DifficultyStats = {
    completedCount: 0,
    bestTimeSeconds: null,
    averageTimeSeconds: null,
  };
  return { easy: { ...empty }, medium: { ...empty }, hard: { ...empty } };
}

function pickFavoriteDifficulty(games: CompletedGame[]): Difficulty | null {
  if (games.length === 0) return null;
  const counts = new Map<Difficulty, number>();
  for (const game of games) {
    counts.set(game.difficulty, (counts.get(game.difficulty) ?? 0) + 1);
  }
  let favorite: Difficulty = DIFFICULTY_ORDER[0];
  let favoriteCount = -1;
  // Идём в фиксированном порядке — при равенстве count побеждает более ранняя сложность.
  for (const difficulty of DIFFICULTY_ORDER) {
    const count = counts.get(difficulty) ?? 0;
    if (count > favoriteCount) {
      favorite = difficulty;
      favoriteCount = count;
    }
  }
  return favorite;
}

export function computeStats(games: CompletedGame[]): PeriodStats {
  const wins = games.filter((game) => game.outcome === 'won');

  const byDifficulty = emptyByDifficulty();
  for (const difficulty of DIFFICULTY_ORDER) {
    const winsForDifficulty = wins.filter((game) => game.difficulty === difficulty);
    byDifficulty[difficulty] = statsFromWins(winsForDifficulty);
  }

  const completionRate = games.length === 0 ? 0 : wins.length / games.length;

  return {
    total: statsFromWins(wins),
    byDifficulty,
    completionRate,
    favoriteDifficulty: pickFavoriteDifficulty(games),
  };
}
```

> Примечание: `completionRate = won / games.length`, т.к. в `games` попадают только исходы won/lost/abandoned (других `CompletedGame` не бывает), значит `games.length === won + lost + abandoned` — ровно знаменатель из design-doc §2.

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run:
```bash
npx vitest run src/state/statsService.test.ts
```
Expected: PASS (все describe-блоки зелёные).

- [ ] **Step 5: Commit**

```bash
git add src/state/statsService.ts src/state/statsService.test.ts
git commit -m "feat: statsService — агрегация статистики по периодам (Phase 6)"
```

---

## Task 4: Интеграция записи `CompletedGame` в `GameProvider`

**Files:**
- Modify: `src/state/GameContext.tsx`
- Test: `src/state/GameContext.test.tsx` (файл существует — дополнить)

**Interfaces:**
- Consumes: `recordCompletedGame` из `./storage/historyDb`; существующие `GameState`, `newGame` в `GameProvider`.
- Produces: побочный эффект — при завершении партии (won/lost) и при отбрасывании in_progress партии (abandoned) в IndexedDB пишется `CompletedGame`. Публичный API `GameApi` не меняется.

Реализация двух точек записи:
1. **won/lost** — `useEffect`, срабатывающий при переходе `status → 'completed'`. Чтобы не записать дважды при ре-рендере, сравниваем с предыдущим статусом через `ref`.
2. **abandoned** — в `newGame()` **перед** `dispatch({ type: 'NEW_GAME' })`, если текущий `state.status === 'in_progress'` **и** партия начата (есть ходы **или** прошло время — чтобы не писать abandoned для нетронутой партии сразу после запуска). Критерий «партия начата»: `state.history.length > 0 || state.elapsedSeconds > 0`.

- [ ] **Step 1: Написать падающий тест**

Дополнить `src/state/GameContext.test.tsx`. Убедиться, что первой строкой файла есть `// @vitest-environment jsdom`. Добавить мок `historyDb` и тесты (импорты `recordCompletedGame` и `vi` добавить к существующим):

```ts
// (в начало файла, рядом с прочими импортами)
import { vi } from 'vitest';
import * as historyDb from './storage/historyDb';

// (после импортов, до describe)
vi.mock('./storage/historyDb', () => ({
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
}));
```

Добавить новый describe-блок. Тест-хелпер выигрывает партию, дозаписывая всё решение через API:

```ts
describe('GameProvider — запись CompletedGame', () => {
  beforeEach(() => {
    vi.mocked(historyDb.recordCompletedGame).mockClear();
  });

  it('победа пишет outcome=won ровно один раз', async () => {
    // Рендерим провайдер и через тестовый хук доигрываем партию до победы,
    // вписывая solution в каждую пустую клетку.
    const api = renderGameApi(); // существующий/локальный хелпер доступа к GameApi
    fillFromSolution(api);       // вписывает все клетки = solution
    await waitFor(() => {
      expect(vi.mocked(historyDb.recordCompletedGame)).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(historyDb.recordCompletedGame).mock.calls[0][0]).toMatchObject({
      outcome: 'won',
    });
  });

  it('поражение (0 жизней) пишет outcome=lost', async () => {
    const api = renderGameApi();
    loseAllLives(api); // трижды вписывает заведомо неверную цифру в пустую клетку
    await waitFor(() => {
      const calls = vi.mocked(historyDb.recordCompletedGame).mock.calls;
      expect(calls.some((call) => call[0].outcome === 'lost')).toBe(true);
    });
  });

  it('Новая игра поверх начатой in_progress пишет outcome=abandoned', async () => {
    const api = renderGameApi();
    makeOneMove(api);           // хотя бы один ход — партия «начата»
    api.newGame('easy');
    await waitFor(() => {
      const calls = vi.mocked(historyDb.recordCompletedGame).mock.calls;
      expect(calls.some((call) => call[0].outcome === 'abandoned')).toBe(true);
    });
  });

  it('Новая игра поверх нетронутой партии НЕ пишет abandoned', async () => {
    const api = renderGameApi();
    api.newGame('easy'); // ходов не было, время 0
    await waitFor(() => {}, { timeout: 50 }).catch(() => {});
    const calls = vi.mocked(historyDb.recordCompletedGame).mock.calls;
    expect(calls.some((call) => call[0].outcome === 'abandoned')).toBe(false);
  });
});
```

> Реализатору: если в существующем `GameContext.test.tsx` уже есть хелперы доступа к `GameApi` (рендер провайдера + чтение контекста, ввод цифр) — используй их вместо `renderGameApi`/`fillFromSolution`/`loseAllLives`/`makeOneMove`. Если нет — реализуй их локально: смонтируй `<GameProvider>` с тест-компонентом, кладущим `useGame()` в `ref`, вводи ходы через `act(() => api.inputDigit(...))`. Для `fillFromSolution` пройди по всем клеткам, где `initialGrid[r][c] === 0`, и вызови `inputDigit({row,col,value: solution[r][c]})`. Для `loseAllLives` найди пустую клетку и трижды вписывай значение `!== solution` (например, число от 1 до 9, не равное `solution[r][c]`), проверяя `api.state.lives`. Убедись, что читаешь свежий `api` из `ref` после каждого `act`, т.к. контекст пересоздаётся.

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run:
```bash
npx vitest run src/state/GameContext.test.tsx
```
Expected: FAIL — `recordCompletedGame` не вызывается (интеграции ещё нет).

- [ ] **Step 3: Реализовать интеграцию в `GameContext.tsx`**

В `src/state/GameContext.tsx`:

3a. Добавить импорт (рядом с импортами storage):
```ts
import { recordCompletedGame } from './storage/historyDb';
```

3b. Добавить хук записи won/lost. Разместить рядом с `useGameTimer`/`useGamePersistence` (уровень модуля):
```ts
/** Пишет CompletedGame один раз при переходе партии в 'completed'. */
function useRecordCompletion(state: GameState): void {
  const prevStatus = useRef(state.status);
  useEffect(() => {
    const justCompleted = prevStatus.current !== 'completed' && state.status === 'completed';
    prevStatus.current = state.status;
    if (!justCompleted || state.result === undefined) return;
    recordCompletedGame({
      difficulty: state.difficulty,
      durationSeconds: state.elapsedSeconds,
      completedAt: new Date().toISOString(),
      outcome: state.result,
    });
  }, [state.status, state.result, state.difficulty, state.elapsedSeconds]);
}
```

3c. Вызвать хук в `GameProvider` (рядом с `useGamePersistence(state)`):
```ts
  useGamePersistence(state);
  useGameTimer({ status: state.status, dispatch });
  useRecordCompletion(state);
```

3d. Заменить `newGame` в `GameProvider` (запись abandoned перед dispatch):
```ts
  const newGame = (difficulty: Difficulty) => {
    const abandoningStartedGame =
      state.status === 'in_progress' && (state.history.length > 0 || state.elapsedSeconds > 0);
    if (abandoningStartedGame) {
      recordCompletedGame({
        difficulty: state.difficulty,
        durationSeconds: state.elapsedSeconds,
        completedAt: new Date().toISOString(),
        outcome: 'abandoned',
      });
    }
    setSettings((prev) => ({ ...prev, lastDifficulty: difficulty }));
    dispatch({ type: 'NEW_GAME', difficulty });
  };
```

> Примечание: `state.difficulty`/`state.elapsedSeconds` внутри `newGame` — это текущая (отбрасываемая) партия, т.к. `dispatch` вызывается после. Именно её надо записать как abandoned.

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run:
```bash
npx vitest run src/state/GameContext.test.tsx
```
Expected: PASS (новые тесты + прежние — без регрессий).

- [ ] **Step 5: Commit**

```bash
git add src/state/GameContext.tsx src/state/GameContext.test.tsx
git commit -m "feat: Запись CompletedGame (won/lost/abandoned) в GameProvider (Phase 6)"
```

---

## Task 5: `StatsView` — экран статистики

**Files:**
- Create: `src/components/stats/StatsView.tsx`
- Create: `src/components/stats/StatsView.module.css`
- Test: `src/components/stats/StatsView.test.tsx`

**Interfaces:**
- Consumes: `getAllCompletedGames` из `../../state/storage/historyDb`; `filterByPeriod`, `computeStats`, `StatsPeriod`, `PeriodStats` из `../../state/statsService`; `useAppView` из `../../state/AppContext`.
- Produces: React-компонент `StatsView` (default export). data-testid: `stats-view`, `period-day`/`period-week`/`period-month`/`period-all`, `stat-completed-count`, `stat-completion-rate`, `stat-best-time`, `stat-average-time`, `stat-favorite-difficulty`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/components/stats/StatsView.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { CompletedGame } from '../../state/storage/historyDb';
import { AppProvider } from '../../state/AppContext';
import StatsView from './StatsView';

vi.mock('../../state/storage/historyDb', () => ({
  getAllCompletedGames: vi.fn(),
}));
import { getAllCompletedGames } from '../../state/storage/historyDb';

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

const SAMPLE: CompletedGame[] = [
  { id: '1', difficulty: 'easy', durationSeconds: 100, completedAt: iso(0), outcome: 'won' },
  { id: '2', difficulty: 'easy', durationSeconds: 300, completedAt: iso(0), outcome: 'won' },
  { id: '3', difficulty: 'hard', durationSeconds: 50, completedAt: iso(20), outcome: 'lost' },
];

function renderStats() {
  return render(
    <AppProvider>
      <StatsView />
    </AppProvider>,
  );
}

describe('StatsView', () => {
  beforeEach(() => {
    vi.mocked(getAllCompletedGames).mockResolvedValue(SAMPLE);
  });

  it('загружает журнал и показывает completedCount за период Всё', async () => {
    renderStats();
    fireEvent.click(await screen.findByTestId('period-all'));
    await waitFor(() => {
      // 2 выигранных всего
      expect(screen.getByTestId('stat-completed-count')).toHaveTextContent('2');
    });
  });

  it('переключение периода меняет цифры (day исключает старую партию)', async () => {
    renderStats();
    fireEvent.click(await screen.findByTestId('period-day'));
    await waitFor(() => {
      // за день только 2 сегодняшних won; проигрыш 20-дневной давности вне периода
      expect(screen.getByTestId('stat-completed-count')).toHaveTextContent('2');
    });
    fireEvent.click(screen.getByTestId('period-all'));
    await waitFor(() => {
      // completionRate за всё: 2 won из 3 → отображается «67%»
      expect(screen.getByTestId('stat-completion-rate')).toHaveTextContent('67');
    });
  });

  it('пустой журнал показывает нули/прочерки без падения', async () => {
    vi.mocked(getAllCompletedGames).mockResolvedValue([]);
    renderStats();
    await waitFor(() => {
      expect(screen.getByTestId('stat-completed-count')).toHaveTextContent('0');
    });
    expect(screen.getByTestId('stat-best-time')).toHaveTextContent('—');
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run:
```bash
npx vitest run src/components/stats/StatsView.test.tsx
```
Expected: FAIL — `Failed to resolve import "./StatsView"`.

- [ ] **Step 3: Реализовать `StatsView.tsx` и стили**

Создать `src/components/stats/StatsView.module.css`:
```css
.screen {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  max-width: 32rem;
  margin: 0 auto;
  width: 100%;
}

.periods {
  display: flex;
  gap: 0.5rem;
}

.periodButton {
  flex: 1;
  min-height: 44px;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
}

.periodButtonActive {
  composes: periodButton;
  background: #1e293b;
  color: #fff;
  border-color: #1e293b;
}

.metrics {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metricRow {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: #f1f5f9;
  border-radius: 0.5rem;
}

.metricLabel {
  color: #475569;
}

.metricValue {
  font-weight: 600;
}

.difficultyBlock {
  margin-top: 0.5rem;
}

.difficultyTitle {
  font-weight: 600;
  margin: 0.75rem 0 0.25rem;
}
```

Создать `src/components/stats/StatsView.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'react';
import type { Difficulty } from '../../core';
import { getAllCompletedGames, type CompletedGame } from '../../state/storage/historyDb';
import {
  filterByPeriod,
  computeStats,
  type StatsPeriod,
  type DifficultyStats,
  type PeriodStats,
} from '../../state/statsService';
import styles from './StatsView.module.css';

const PERIODS: Array<{ id: StatsPeriod; label: string }> = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'all', label: 'Всё' },
];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
};

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '—';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatFavorite(favorite: Difficulty | null): string {
  if (favorite === null) return '—';
  return DIFFICULTY_LABELS[favorite];
}

interface MetricRowProps {
  label: string;
  value: string;
  testId: string;
}

function MetricRow({ label, value, testId }: MetricRowProps) {
  return (
    <div className={styles.metricRow}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue} data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

function DifficultyBreakdown({ stats }: { stats: PeriodStats }) {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  return (
    <div className={styles.difficultyBlock}>
      {difficulties.map((difficulty) => {
        const perDifficulty: DifficultyStats = stats.byDifficulty[difficulty];
        return (
          <div key={difficulty}>
            <h3 className={styles.difficultyTitle}>{DIFFICULTY_LABELS[difficulty]}</h3>
            <MetricRow
              label="Завершено"
              value={String(perDifficulty.completedCount)}
              testId={`stat-diff-${difficulty}-count`}
            />
            <MetricRow
              label="Лучшее время"
              value={formatSeconds(perDifficulty.bestTimeSeconds)}
              testId={`stat-diff-${difficulty}-best`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function StatsView() {
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const [games, setGames] = useState<CompletedGame[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getAllCompletedGames().then((loadedGames) => {
      if (active) {
        setGames(loadedGames);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const filtered = filterByPeriod(games, period, new Date());
    return computeStats(filtered);
  }, [games, period]);

  return (
    <div className={styles.screen} data-testid="stats-view">
      <div className={styles.periods}>
        {PERIODS.map((option) => {
          const isActive = option.id === period;
          const className = isActive ? styles.periodButtonActive : styles.periodButton;
          return (
            <button
              key={option.id}
              type="button"
              className={className}
              data-testid={`period-${option.id}`}
              aria-pressed={isActive}
              onClick={() => setPeriod(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {!loaded && <p>Загрузка…</p>}

      <div className={styles.metrics}>
        <MetricRow
          label="Завершено партий"
          value={String(stats.total.completedCount)}
          testId="stat-completed-count"
        />
        <MetricRow
          label="% завершённых"
          value={formatPercent(stats.completionRate)}
          testId="stat-completion-rate"
        />
        <MetricRow
          label="Лучшее время"
          value={formatSeconds(stats.total.bestTimeSeconds)}
          testId="stat-best-time"
        />
        <MetricRow
          label="Среднее время"
          value={formatSeconds(stats.total.averageTimeSeconds)}
          testId="stat-average-time"
        />
        <MetricRow
          label="Любимая сложность"
          value={formatFavorite(stats.favoriteDifficulty)}
          testId="stat-favorite-difficulty"
        />
      </div>

      <DifficultyBreakdown stats={stats} />
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run:
```bash
npx vitest run src/components/stats/StatsView.test.tsx
```
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add src/components/stats/StatsView.tsx src/components/stats/StatsView.module.css src/components/stats/StatsView.test.tsx
git commit -m "feat: StatsView — экран статистики по периодам (Phase 6)"
```

---

## Task 6: Переключатель вида в `Header` + рендер по `activeView` в `App`

**Files:**
- Modify: `src/components/header/Header.tsx`
- Modify: `src/components/header/Header.test.tsx` (дополнить)
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAppView` из `../../state/AppContext`; `StatsView` из `./components/stats/StatsView`.
- Produces: кнопка-тумблер в Header (`data-testid="toggle-stats"`); `App` рендерит `GameScreen` или `StatsView` по `activeView`.

Тумблер: в виде `game` кнопка показывает «📊» (aria-label «Статистика») и вызывает `setActiveView('stats')`; в виде `stats` показывает «В игру» и вызывает `setActiveView('game')`. Но `Header` рендерится внутри `GameScreen` — поэтому тумблер в Header достаточно всегда переключать на `stats`. Возврат из статистики делает отдельная кнопка в `StatsView`? Нет — по решению используем ОДНУ кнопку-тумблер: разместим её в `Header`, а `Header` вынесем так, чтобы он показывался в обоих видах. Проще: тумблер живёт в `Header` (виден в игре) и в `StatsView` добавим кнопку «В игру» с тем же `data-testid` семейством. Чтобы не плодить сущности, решение ниже: Header всегда переключает game↔stats по текущему `activeView`.

> **Реализационное уточнение:** `Header` сейчас рендерится только в `GameScreen`. Чтобы тумблер работал в обе стороны одной кнопкой, добавляем кнопку «В игру» (`data-testid="toggle-game"`) в сам `StatsView` (Task 5 уже отрендерил экран; добавим кнопку здесь, в Task 6, чтобы Header и возврат жили в одном коммите переключения вида). Итог: `toggle-stats` в Header (game→stats), `toggle-game` в StatsView (stats→game).

- [ ] **Step 1: Написать падающие тесты**

6a. Дополнить `src/components/header/Header.test.tsx` (первая строка уже `// @vitest-environment jsdom`). Header использует `useAppView`, поэтому в тестах его нужно обернуть в `AppProvider`. Добавить импорт `AppProvider` и тест:
```tsx
import { AppProvider } from '../../state/AppContext';

// ... в существующий рендер-хелпер Header обернуть дерево в <AppProvider>...</AppProvider>,
// либо в новом тесте:
it('кнопка toggle-stats присутствует и переключает вид на статистику', () => {
  // Рендерим Header внутри AppProvider (+ GameProvider, если требуется useGame).
  // Проверяем, что клик по toggle-stats не бросает и кнопка помечена stats.
  renderHeaderWithProviders(); // хелпер, оборачивающий Header в AppProvider+GameProvider
  const toggle = screen.getByTestId('toggle-stats');
  expect(toggle).toBeInTheDocument();
  fireEvent.click(toggle);
  // Переключение проверяется на уровне App (Task 6b); здесь достаточно, что клик обрабатывается.
});
```

> Реализатору: если существующий тест Header монтирует его без провайдеров — добавь `AppProvider` (и `GameProvider`, который уже используется) в общий рендер-хелпер, иначе `useAppView` бросит. Не дублируй провайдер в каждом тесте — оберни один хелпер.

6b. Добавить интеграционный тест переключения на уровне `App`. Создать `src/App.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// StatsView лезет в IndexedDB — мокаем журнал, чтобы тест был чистым.
vi.mock('./state/storage/historyDb', () => ({
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
}));

import App from './App';

describe('App — переключение вида', () => {
  it('по toggle-stats показывает статистику, по toggle-game возвращает игру', async () => {
    render(<App />);
    expect(screen.getByTestId('header')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle-stats'));
    await waitFor(() => {
      expect(screen.getByTestId('stats-view')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('toggle-game'));
    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run:
```bash
npx vitest run src/App.test.tsx src/components/header/Header.test.tsx
```
Expected: FAIL — `toggle-stats`/`toggle-game` не найдены; `App` не переключает вид.

- [ ] **Step 3: Реализация**

3a. В `src/components/header/Header.tsx` добавить импорт и кнопку тумблера в блок `actions`:
```tsx
import { useAppView } from '../../state/AppContext';
```
Внутри компонента, до `return`:
```tsx
  const { setActiveView } = useAppView();
```
Первой кнопкой в `<div className={styles.actions}>` добавить:
```tsx
        <button
          type="button"
          className={styles.action}
          data-testid="toggle-stats"
          onClick={() => setActiveView('stats')}
          aria-label="Статистика"
        >
          📊
        </button>
```

3b. В `src/components/stats/StatsView.tsx` добавить кнопку возврата «В игру». Импорт `useAppView` вверху:
```tsx
import { useAppView } from '../../state/AppContext';
```
В компоненте до `return`:
```tsx
  const { setActiveView } = useAppView();
```
Первой строкой внутри `<div className={styles.screen} data-testid="stats-view">` (до `.periods`):
```tsx
      <button
        type="button"
        className={styles.periodButton}
        data-testid="toggle-game"
        onClick={() => setActiveView('game')}
      >
        ← В игру
      </button>
```

3c. Переписать `src/App.tsx` для рендера по `activeView`:
```tsx
import { AppProvider, useAppView } from './state/AppContext';
import { GameProvider } from './state/GameContext';
import GameScreen from './components/game/GameScreen';
import StatsView from './components/stats/StatsView';
import './App.css';

function ActiveView() {
  const { activeView } = useAppView();
  if (activeView === 'stats') return <StatsView />;
  return <GameScreen />;
}

export default function App() {
  return (
    <AppProvider>
      <GameProvider>
        <ActiveView />
      </GameProvider>
    </AppProvider>
  );
}
```

> Примечание: `GameProvider` остаётся смонтированным в обоих видах — партия и таймер живут, пока игрок смотрит статистику. `StatsView` использует `useAppView`, поэтому находится внутри `AppProvider` (так и есть).

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run:
```bash
npx vitest run src/App.test.tsx src/components/header/Header.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/header/Header.tsx src/components/header/Header.test.tsx src/components/stats/StatsView.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: Переключение игра↔статистика (Header тумблер + App по activeView) (Phase 6)"
```

---

## Task 7: Финальная верификация и обновление трекинга

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md`

- [ ] **Step 1: Полная проверка**

Run:
```bash
npm run type-check && npm run lint && npm test && npm run build
```
Expected: всё PASS. При ошибках линтера (напр. неиспользованные импорты, порядок) — исправить и перезапустить.

- [ ] **Step 2: Ручная проверка**

Run:
```bash
npm run dev
```
Проверить вручную:
1. Доиграть партию до победы → переключиться на статистику (📊) → «Завершено партий» и «% завершённых» отражают победу.
2. Начать новую игру, слить 3 жизни (вписать неверные цифры) → поражение → в статистике `% завершённых` уменьшился (учтён lost).
3. Начать партию, сделать ход, нажать «Новая» → выбрать сложность → в статистике учтён `abandoned` (rate уменьшился, completedCount не вырос).
4. Переключатель периодов День/Неделя/Месяц/Всё меняет цифры.
5. Кнопка «← В игру» из статистики возвращает на поле, партия/таймер на месте.

- [ ] **Step 3: Обновить `docs/roadmap.md`**

Найти строку «Статистика по периодам»: статус → `✅ готово`, проставить дату завершения `2026-07-03`, ветку `feat/phase-6-stats`.

- [ ] **Step 4: Отметить фазу 6 в индексе планов**

В `docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md`, строка фазы 6: статус детализации → ссылка на этот план и `✅ реализован (2026-07-03, feat/phase-6-stats)`.

- [ ] **Step 5: Commit**

```bash
git add docs/roadmap.md docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md
git commit -m "docs: Отметить фазу 6 (статистика) завершённой (Phase 6)"
```

- [ ] **Step 6: Завершение ветки**

Использовать `superpowers:finishing-a-development-branch` для интеграции (PR/merge по выбору пользователя).

---

## Self-Review (выполнено при написании плана)

**Spec coverage (design-doc §2-4):**
- `CompletedGame` тип, store `games`, индекс по `completedAt`, миграции через `upgrade` — Task 2. ✅
- `recordCompletedGame` / `getAllCompletedGames` — Task 2. ✅
- Три точки записи (won/lost через useEffect, abandoned в newGame) — Task 4. ✅
- `filterByPeriod(games, period, now)` с `now` параметром; периоды day/week/month/all — Task 3. ✅
- Метрики completedCount(won) / best/average(won) / completionRate=won/(won+lost+abandoned) / favoriteDifficulty(все записи, tie-break) — Task 3. ✅
- Per-difficulty + общие — Task 3 (`byDifficulty` + `total`). ✅
- StatsView: переключатель периода (4 таба с data-testid) + метрики с разбивкой; загрузка через useEffect+getAllCompletedGames при монтировании; локальный useState — Task 5. ✅
- Header тумблер (useAppView.setActiveView) — Task 6. ✅
- App рендерит GameScreen/StatsView по activeView — Task 6. ✅
- Тесты: statsService (граничные «сегодня в day и week», favoriteDifficulty при равенстве) — Task 3; historyDb (fake-indexeddb в jsdom) — Task 2. ✅
- npm install idb + fake-indexeddb devDep — Task 1. ✅

**Placeholder scan:** тест-хелперы в Task 4 (`renderGameApi` и др.) описаны с указанием переиспользовать существующие из `GameContext.test.tsx` или реализовать локально по инструкции — это не placeholder кода реализации, а адаптация к уже существующему тест-файлу, содержимое которого реализатор видит.

**Type consistency:** `CompletedGame`, `GameOutcome`, `StatsPeriod`, `PeriodStats`, `DifficultyStats`, `filterByPeriod`, `computeStats`, `recordCompletedGame`, `getAllCompletedGames` — имена и сигнатуры совпадают между Task 2/3/4/5. `favoriteDifficulty: Difficulty | null`, времена `number | null` — согласованы с форматтерами в Task 5.
