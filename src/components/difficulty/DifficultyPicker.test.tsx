// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import DifficultyPicker from './DifficultyPicker';
import { SettingsProvider } from '../../state/SettingsContext';
import { RecordsProvider } from '../../state/RecordsContext';

vi.mock('../../state/storage/historyDb', () => ({
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
  clearAllCompletedGames: vi.fn().mockResolvedValue(undefined),
}));

function renderPicker(props: Partial<Parameters<typeof DifficultyPicker>[0]> = {}) {
  const merged = { onStart: vi.fn(), onClose: vi.fn(), ...props };
  render(
    <SettingsProvider>
      <RecordsProvider>
        <DifficultyPicker {...merged} />
      </RecordsProvider>
    </SettingsProvider>,
  );
  return merged;
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

describe('DifficultyPicker', () => {
  it('«Начать» запускает выбранную по умолчанию сложность (lastDifficulty=easy)', () => {
    const props = renderPicker();
    fireEvent.click(screen.getByTestId('difficulty-start'));
    expect(props.onStart).toHaveBeenCalledWith('easy');
  });

  it('выбор другой сложности меняет запускаемый уровень', () => {
    const props = renderPicker();
    fireEvent.click(screen.getByTestId('difficulty-hard'));
    fireEvent.click(screen.getByTestId('difficulty-start'));
    expect(props.onStart).toHaveBeenCalledWith('hard');
  });

  it('без рекорда показывает «Ещё нет рекорда»', () => {
    renderPicker();
    expect(screen.getByTestId('difficulty-record-easy').textContent).toBe('Ещё нет рекорда');
  });

  it('клик по фону вызывает onClose', () => {
    const props = renderPicker();
    fireEvent.click(screen.getByLabelText('Закрыть'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
