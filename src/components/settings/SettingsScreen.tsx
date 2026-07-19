import { useAppView } from '../../state/AppContext';
import { useSettings, type SettingsFlag } from '../../state/SettingsContext';
import { useRecords } from '../../state/RecordsContext';
import { useGame } from '../../state/GameContext';
import { useAppUpdate } from '../../state/appUpdate';
import { clearAllCompletedGames } from '../../state/storage/historyDb';
import type { Theme } from '../../state/gameTypes';
import type { UpdateCheckState } from '../../state/updateCheckState';
import Toggle from '../ui/Toggle';
import styles from './SettingsScreen.module.css';

// Отображаемая версия — заглушка (реальная схема версий появится с PWA-обновлением).
const APP_VERSION = '1.0.0';

const THEME_OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: 'Система' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

const GAME_TOGGLES: Array<{ flag: SettingsFlag; label: string; testId: string }> = [
  { flag: 'highlightSameDigits', label: 'Подсветка одинаковых цифр', testId: 'toggle-same-digits' },
  { flag: 'highlightPeers', label: 'Подсветка строки, столбца, блока', testId: 'toggle-peers' },
  { flag: 'showRemainingCounts', label: 'Счётчик оставшихся цифр', testId: 'toggle-remaining' },
];

const UPDATE_BUTTON_LABELS: Record<UpdateCheckState, string> = {
  idle: 'Проверить обновления',
  checking: 'Проверяем…',
  updateReady: 'Обновить',
  notFound: 'Обновлений не найдено',
  offline: 'Нет соединения',
  failed: 'Не удалось проверить',
};

export default function SettingsScreen() {
  const { goBack } = useAppView();
  const { settings, setTheme, toggle } = useSettings();
  const records = useRecords();
  const game = useGame();
  const { checkState, handleVersionAction } = useAppUpdate(() => game.state);

  const resetStats = async () => {
    await clearAllCompletedGames();
    await records.refresh();
  };

  const updateButtonLabel = UPDATE_BUTTON_LABELS[checkState];
  const isCheckInProgress = checkState === 'checking';

  return (
    <div className={styles.screen} data-testid="settings-screen">
      <div className={styles.header}>
        <button type="button" className={styles.back} data-testid="settings-back" onClick={goBack}>
          ‹
        </button>
        <h1 className={styles.title}>Настройки</h1>
      </div>

      <div className={styles.groupLabel}>Оформление</div>
      <div className={styles.segment} role="radiogroup" aria-label="Тема оформления">
        {THEME_OPTIONS.map((option) => {
          const active = settings.theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? styles.segmentItemActive : styles.segmentItem}
              data-testid={`theme-${option.value}`}
              onClick={() => setTheme(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className={styles.groupLabel}>Игра</div>
      <div className={styles.card}>
        {GAME_TOGGLES.map((item) => (
          <div key={item.flag} className={styles.row}>
            <span className={styles.rowText}>{item.label}</span>
            <Toggle
              checked={settings[item.flag]}
              onChange={() => toggle(item.flag)}
              label={item.label}
              testId={item.testId}
            />
          </div>
        ))}
      </div>

      <div className={styles.groupLabel}>Данные</div>
      <div className={styles.card}>
        <div className={styles.row}>
          <div className={styles.versionText}>
            <span className={styles.rowText}>Версия</span>
            <span className={styles.versionNumber}>{APP_VERSION}</span>
          </div>
          <button
            type="button"
            className={styles.updateButton}
            data-testid="update-app"
            disabled={isCheckInProgress}
            onClick={handleVersionAction}
          >
            {updateButtonLabel}
          </button>
        </div>
        <div className={styles.row}>
          <button
            type="button"
            className={styles.resetButton}
            data-testid="reset-stats"
            onClick={resetStats}
          >
            Сбросить статистику
          </button>
        </div>
      </div>
    </div>
  );
}
