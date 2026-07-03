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
