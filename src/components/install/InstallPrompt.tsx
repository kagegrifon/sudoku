import { useEffect, useState } from 'react';
import { useSettings } from '../../state/SettingsContext';
import { isIosSafari, isStandaloneDisplay } from '../../state/installDetect';
import styles from './InstallPrompt.module.css';

// Событие Android-установки (не в стандартных типах DOM lib).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/**
 * Независимый оверлей установки. Android — нативный beforeinstallprompt + кнопка.
 * iOS Safari — текстовая инструкция один раз (флаг iosInstallPromptDismissed).
 * Ничего не показывает, если приложение уже установлено (standalone).
 */
export default function InstallPrompt() {
  const { settings, dismissIosInstallPrompt } = useSettings();
  const [androidPrompt, setAndroidPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [androidDismissed, setAndroidDismissed] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setAndroidPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (isStandaloneDisplay()) return null;

  const showAndroid = androidPrompt !== null && !androidDismissed;
  const showIos = isIosSafari(navigator.userAgent) && !settings.iosInstallPromptDismissed;

  if (showAndroid) {
    return (
      <div className={styles.prompt} role="dialog" data-testid="install-prompt">
        <span className={styles.text}>Установить приложение на устройство?</span>
        <button
          type="button"
          className={styles.accept}
          data-testid="install-prompt-accept"
          onClick={() => {
            void androidPrompt.prompt();
            setAndroidDismissed(true);
          }}
        >
          Установить
        </button>
        <button
          type="button"
          className={styles.dismiss}
          aria-label="Закрыть"
          data-testid="install-prompt-dismiss"
          onClick={() => setAndroidDismissed(true)}
        >
          ✕
        </button>
      </div>
    );
  }

  if (showIos) {
    return (
      <div className={styles.prompt} role="dialog" data-testid="install-prompt">
        <span className={styles.text}>
          Чтобы установить: нажмите «Поделиться», затем «На экран „Домой“».
        </span>
        <button
          type="button"
          className={styles.dismiss}
          aria-label="Закрыть"
          data-testid="install-prompt-dismiss"
          onClick={dismissIosInstallPrompt}
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
