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
