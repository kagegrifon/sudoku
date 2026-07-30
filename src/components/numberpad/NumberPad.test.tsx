// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import NumberPad from './NumberPad';
import type { RemainingDigit } from '../../state/remainingDigits';

afterEach(cleanup);

/** Остатки по цифрам: перечисленные считаются полностью расставленными. */
function remainingWithCompleted(completed: number[]): Record<number, RemainingDigit> {
  const result: Record<number, RemainingDigit> = {};
  for (let digit = 1; digit <= 9; digit += 1) {
    const placed = completed.includes(digit) ? 9 : 4;
    result[digit] = { placed, remaining: 9 - placed };
  }
  return result;
}

function renderPad(overrides: Partial<Parameters<typeof NumberPad>[0]> = {}) {
  const completedDigits = overrides.completedDigits ?? new Set<number>();
  const props = {
    onDigit: vi.fn(),
    disabled: false,
    showRemaining: false,
    remainingByDigit: remainingWithCompleted([...completedDigits]),
    completedDigits,
    ...overrides,
  };
  render(<NumberPad {...props} />);
  return props;
}

describe('NumberPad — скрытие полностью расставленных цифр', () => {
  it('завершённая цифра остаётся в DOM, но помечена и задизейблена', () => {
    renderPad({ completedDigits: new Set([7]) });
    const key = screen.getByTestId('digit-7');
    expect(key).toBeInTheDocument();
    expect(key.getAttribute('data-completed')).toBe('true');
    expect(key).toBeDisabled();
  });

  it('клик по завершённой цифре не вызывает onDigit', () => {
    const props = renderPad({ completedDigits: new Set([7]) });
    fireEvent.click(screen.getByTestId('digit-7'));
    expect(props.onDigit).not.toHaveBeenCalled();
  });

  it('незавершённые цифры не затронуты и остаются кликабельными', () => {
    const props = renderPad({ completedDigits: new Set([7]) });
    const key = screen.getByTestId('digit-3');
    expect(key.getAttribute('data-completed')).toBeNull();
    expect(key).not.toBeDisabled();
    fireEvent.click(key);
    expect(props.onDigit).toHaveBeenCalledWith(3);
  });

  it('у завершённой цифры счётчик остатка не рендерится', () => {
    renderPad({ completedDigits: new Set([7]), showRemaining: true });
    expect(screen.queryByTestId('digit-7-remaining')).toBeNull();
    expect(screen.getByTestId('digit-3-remaining')).toBeInTheDocument();
  });

  it('все девять кнопок присутствуют — слоты в раскладке сохраняются', () => {
    renderPad({ completedDigits: new Set([1, 2, 3]) });
    for (let digit = 1; digit <= 9; digit += 1) {
      expect(screen.getByTestId(`digit-${digit}`)).toBeInTheDocument();
    }
  });
});
