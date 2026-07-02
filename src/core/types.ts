export type Difficulty = 'easy' | 'medium' | 'hard';

/** Поле судоку 9×9. 0 = пустая клетка. */
export type Grid = number[][];

export const GRID_SIZE = 9;
export const BOX_SIZE = 3;
export const EMPTY_CELL = 0;
