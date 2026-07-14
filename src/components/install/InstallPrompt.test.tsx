// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

let iosSafariValue = false;
let standaloneValue = false;
vi.mock('../../state/installDetect', () => ({
  isIosSafari: () => iosSafariValue,
  isStandaloneDisplay: () => standaloneValue,
}));

const dismissIosInstallPrompt = vi.fn();
let iosDismissedValue = false;
vi.mock('../../state/SettingsContext', () => ({
  useSettings: () => ({
    settings: { iosInstallPromptDismissed: iosDismissedValue },
    dismissIosInstallPrompt,
  }),
}));

import InstallPrompt from './InstallPrompt';

beforeEach(() => {
  iosSafariValue = false;
  standaloneValue = false;
  iosDismissedValue = false;
  dismissIosInstallPrompt.mockClear();
});
afterEach(cleanup);

describe('InstallPrompt — iOS', () => {
  it('показывает iOS-инструкцию в Safari, когда ещё не закрыта', () => {
    iosSafariValue = true;
    render(<InstallPrompt />);
    expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
  });

  it('не показывает iOS-инструкцию, если уже закрыта', () => {
    iosSafariValue = true;
    iosDismissedValue = true;
    render(<InstallPrompt />);
    expect(screen.queryByTestId('install-prompt')).toBeNull();
  });

  it('крестик на iOS вызывает dismissIosInstallPrompt', () => {
    iosSafariValue = true;
    render(<InstallPrompt />);
    fireEvent.click(screen.getByTestId('install-prompt-dismiss'));
    expect(dismissIosInstallPrompt).toHaveBeenCalledTimes(1);
  });

  it('не показывает ничего в standalone-режиме', () => {
    iosSafariValue = true;
    standaloneValue = true;
    render(<InstallPrompt />);
    expect(screen.queryByTestId('install-prompt')).toBeNull();
  });

  it('не показывает ничего в обычном браузере без beforeinstallprompt', () => {
    render(<InstallPrompt />);
    expect(screen.queryByTestId('install-prompt')).toBeNull();
  });
});
