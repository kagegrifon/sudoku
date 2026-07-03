// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider, useAppView } from './AppContext';

function Probe() {
  const { activeView, setActiveView } = useAppView();
  return (
    <div>
      <span data-testid="view">{activeView}</span>
      <button type="button" data-testid="go-stats" onClick={() => setActiveView('stats')}>
        stats
      </button>
    </div>
  );
}

afterEach(cleanup);

describe('AppContext', () => {
  it('стартовый вид — game', () => {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    expect(screen.getByTestId('view').textContent).toBe('game');
  });
  it('setActiveView переключает вид', () => {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    fireEvent.click(screen.getByTestId('go-stats'));
    expect(screen.getByTestId('view').textContent).toBe('stats');
  });
  it('useAppView бросает ошибку вне провайдера', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useAppView должен использоваться внутри AppProvider');
    spy.mockRestore();
  });
});
