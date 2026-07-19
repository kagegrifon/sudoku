// @vitest-environment jsdom
import { useEffect, useRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Header from './Header';
import { GameProvider, useGame } from '../../state/GameContext';
import { SettingsProvider } from '../../state/SettingsContext';
import { RecordsProvider } from '../../state/RecordsContext';
import { AppProvider, useAppView } from '../../state/AppContext';
import * as core from '../../core';
import type { Grid } from '../../core';

vi.mock('../../state/storage/historyDb', () => ({
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
  clearAllCompletedGames: vi.fn().mockResolvedValue(undefined),
}));

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

function CurrentScreen() {
  const { screen: current } = useAppView();
  return <span data-testid="current-screen">{current}</span>;
}

/** Header в приложении рендерится только с активной партией — стартуем её в тесте. */
function GameStarter() {
  const game = useGame();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    game.newGame('easy');
  }, [game]);
  return null;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.spyOn(core, 'generatePuzzle').mockReturnValue({ puzzle: puzzleOneHole(), solution: solved });
});
afterEach(cleanup);

function renderHeader() {
  return render(
    <AppProvider>
      <SettingsProvider>
        <RecordsProvider>
          <GameProvider>
            <GameStarter />
            <CurrentScreen />
            <Header />
          </GameProvider>
        </RecordsProvider>
      </SettingsProvider>
    </AppProvider>,
  );
}

describe('Header', () => {
  it('показывает стартовый таймер 00:00', () => {
    renderHeader();
    expect(screen.getByTestId('timer').textContent).toBe('00:00');
  });
  it('показывает индикатор жизней и уровень', () => {
    renderHeader();
    expect(screen.getByTestId('lives')).toBeTruthy();
    expect(screen.getByTestId('header').textContent).toContain('Уровень');
  });
  it('кнопка «‹ назад» уводит на home', () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('game-back'));
    expect(screen.getByTestId('current-screen').textContent).toBe('home');
  });
  it('кнопка «⚙» уводит в настройки', () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('game-settings'));
    expect(screen.getByTestId('current-screen').textContent).toBe('settings');
  });
  it('кнопка паузы присутствует и активна для идущей партии', () => {
    renderHeader();
    expect(screen.getByTestId('pause')).not.toBeDisabled();
  });
});
