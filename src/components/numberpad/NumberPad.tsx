import type { RemainingDigit } from '../../state/remainingDigits';
import styles from './NumberPad.module.css';

export interface NumberPadProps {
  onDigit(value: number): void;
  disabled: boolean;
  showRemaining: boolean;
  remainingByDigit: Record<number, RemainingDigit>;
  /** Цифры с девятью верными вхождениями: кнопка скрыта, слот в раскладке сохраняется. */
  completedDigits: ReadonlySet<number>;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function NumberPad({
  onDigit,
  disabled,
  showRemaining,
  remainingByDigit,
  completedDigits,
}: NumberPadProps) {
  return (
    <div className={styles.pad} data-testid="numberpad">
      {DIGITS.map((digit) => {
        const remaining = remainingByDigit[digit]?.remaining ?? 0;
        const completed = completedDigits.has(digit);
        const keyClassName = completed ? `${styles.key} ${styles.completed}` : styles.key;
        // У завершённой цифры счётчик остатка не нужен: он всегда нулевой.
        const showRemainingForDigit = showRemaining && !completed;
        return (
          <button
            key={digit}
            type="button"
            className={keyClassName}
            data-testid={`digit-${digit}`}
            data-completed={completed ? 'true' : undefined}
            disabled={disabled || completed}
            aria-hidden={completed || undefined}
            tabIndex={completed ? -1 : undefined}
            onClick={() => onDigit(digit)}
          >
            <span className={styles.digit}>{digit}</span>
            {showRemainingForDigit && (
              <span className={styles.remaining} data-testid={`digit-${digit}-remaining`}>
                {remaining}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
