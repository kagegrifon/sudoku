import styles from './ActionsBar.module.css';

interface ActionsBarProps {
  canUndo: boolean;
  notesMode: boolean;
  disabled: boolean;
  onUndo(): void;
  onErase(): void;
  onToggleNotes(): void;
}

export default function ActionsBar({
  canUndo,
  notesMode,
  disabled,
  onUndo,
  onErase,
  onToggleNotes,
}: ActionsBarProps) {
  return (
    <div className={styles.bar} data-testid="actions-bar">
      <button
        type="button"
        className={styles.action}
        data-testid="undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <span className={styles.icon}>↶</span>
        <span className={styles.label}>Отменить</span>
      </button>

      <button
        type="button"
        className={styles.action}
        data-testid="erase-action"
        disabled={disabled}
        onClick={onErase}
      >
        <span className={styles.icon}>⌫</span>
        <span className={styles.label}>Очистить</span>
      </button>

      <button
        type="button"
        className={styles.action}
        data-testid="notes-toggle"
        aria-pressed={notesMode}
        onClick={onToggleNotes}
      >
        <span className={styles.iconWithBadge}>
          ✎
          <span className={notesMode ? styles.badgeOn : styles.badgeOff}>
            {notesMode ? 'ON' : 'OFF'}
          </span>
        </span>
        <span className={styles.label}>Заметки</span>
      </button>
    </div>
  );
}
