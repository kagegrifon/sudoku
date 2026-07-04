// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import GameScreen from './GameScreen';
import { GameProvider } from '../../state/GameContext';
import { AppProvider } from '../../state/AppContext';
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
    <AppProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </AppProvider>,
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
