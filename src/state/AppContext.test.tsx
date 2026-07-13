// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider, useAppView } from './AppContext';

function Probe() {
  const { screen: current, previous, navigate, goBack } = useAppView();
  return (
    <div>
      <span data-testid="screen">{current}</span>
      <span data-testid="previous">{previous ?? 'null'}</span>
      <button type="button" data-testid="go-stats" onClick={() => navigate('stats')}>
        stats
      </button>
      <button type="button" data-testid="go-settings" onClick={() => navigate('settings')}>
        settings
      </button>
      <button type="button" data-testid="go-back" onClick={goBack}>
        back
      </button>
    </div>
  );
}

afterEach(cleanup);

function renderProbe() {
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );
}

describe('AppContext', () => {
  it('стартовый экран — home, previous пуст', () => {
    renderProbe();
    expect(screen.getByTestId('screen').textContent).toBe('home');
    expect(screen.getByTestId('previous').textContent).toBe('null');
  });

  it('navigate переходит на экран и запоминает previous', () => {
    renderProbe();
    fireEvent.click(screen.getByTestId('go-stats'));
    expect(screen.getByTestId('screen').textContent).toBe('stats');
    expect(screen.getByTestId('previous').textContent).toBe('home');
  });

  it('goBack возвращает в previous', () => {
    renderProbe();
    fireEvent.click(screen.getByTestId('go-settings'));
    fireEvent.click(screen.getByTestId('go-back'));
    expect(screen.getByTestId('screen').textContent).toBe('home');
  });

  it('goBack без истории уводит в home', () => {
    renderProbe();
    fireEvent.click(screen.getByTestId('go-back'));
    expect(screen.getByTestId('screen').textContent).toBe('home');
  });

  it('useAppView бросает ошибку вне провайдера', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useAppView должен использоваться внутри AppProvider');
    spy.mockRestore();
  });
});
