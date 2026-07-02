import styles from './NumberPad.module.css';

export interface NumberPadProps {
  onDigit(value: number): void;
  onErase(): void;
  disabled: boolean;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function NumberPad({ onDigit, onErase, disabled }: NumberPadProps) {
  return (
    <div className={styles.pad} data-testid="numberpad">
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          className={styles.key}
          data-testid={`digit-${digit}`}
          disabled={disabled}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        className={styles.erase}
        data-testid="erase"
        disabled={disabled}
        onClick={onErase}
      >
        ⌫
      </button>
    </div>
  );
}
