// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

let updateAvailableValue = false;
const applyUpdate = vi.fn();
vi.mock('../../state/appUpdate', () => ({
  useAppUpdate: () => ({ updateAvailable: updateAvailableValue, applyUpdate }),
}));

vi.mock('../../state/GameContext', () => ({
  useGame: () => ({ state: { puzzleId: 'p1', status: 'paused' } }),
}));

import UpdateBanner from './UpdateBanner';

beforeEach(() => {
  updateAvailableValue = false;
  applyUpdate.mockClear();
});
afterEach(cleanup);

describe('UpdateBanner', () => {
  it('скрыт, когда обновление недоступно', () => {
    render(<UpdateBanner />);
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });

  it('виден, когда обновление доступно', () => {
    updateAvailableValue = true;
    render(<UpdateBanner />);
    expect(screen.getByTestId('update-banner')).toBeInTheDocument();
  });

  it('кнопка «Обновить» вызывает applyUpdate', () => {
    updateAvailableValue = true;
    render(<UpdateBanner />);
    fireEvent.click(screen.getByTestId('update-banner-apply'));
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('крестик скрывает баннер (но не отменяет доступность обновления)', () => {
    updateAvailableValue = true;
    render(<UpdateBanner />);
    fireEvent.click(screen.getByTestId('update-banner-dismiss'));
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });
});
