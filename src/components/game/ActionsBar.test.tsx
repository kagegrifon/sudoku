// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ActionsBar from './ActionsBar';

afterEach(cleanup);

function renderBar(overrides: Partial<Parameters<typeof ActionsBar>[0]> = {}) {
  const props = {
    canUndo: true,
    notesMode: false,
    disabled: false,
    onUndo: vi.fn(),
    onErase: vi.fn(),
    onToggleNotes: vi.fn(),
    ...overrides,
  };
  render(<ActionsBar {...props} />);
  return props;
}

describe('ActionsBar', () => {
  it('undo задизейблен при canUndo=false', () => {
    renderBar({ canUndo: false });
    expect(screen.getByTestId('undo')).toBeDisabled();
  });

  it('клик undo/erase вызывает колбэки', () => {
    const props = renderBar();
    fireEvent.click(screen.getByTestId('undo'));
    fireEvent.click(screen.getByTestId('erase-action'));
    expect(props.onUndo).toHaveBeenCalledTimes(1);
    expect(props.onErase).toHaveBeenCalledTimes(1);
  });

  it('бейдж заметок отражает режим и aria-pressed', () => {
    renderBar({ notesMode: true });
    const toggle = screen.getByTestId('notes-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toContain('ON');
  });

  it('erase задизейблен при disabled=true, undo зависит только от canUndo', () => {
    renderBar({ disabled: true, canUndo: true });
    expect(screen.getByTestId('erase-action')).toBeDisabled();
    expect(screen.getByTestId('undo')).not.toBeDisabled();
  });
});
