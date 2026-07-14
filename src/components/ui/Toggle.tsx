import styles from './Toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange(): void;
  label: string;
  testId?: string;
}

/** Пилюля-переключатель 46×28 в iOS-стиле (role="switch"). */
export default function Toggle({ checked, onChange, label, testId }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      className={checked ? styles.trackOn : styles.trackOff}
      onClick={onChange}
    >
      <span className={styles.thumb} />
    </button>
  );
}
