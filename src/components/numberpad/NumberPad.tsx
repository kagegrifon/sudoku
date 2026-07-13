import type { RemainingDigit } from '../../state/remainingDigits';
import styles from './NumberPad.module.css';

export interface NumberPadProps {
  onDigit(value: number): void;
  disabled: boolean;
  showRemaining: boolean;
  remainingByDigit: Record<number, RemainingDigit>;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function NumberPad({
  onDigit,
  disabled,
  showRemaining,
  remainingByDigit,
}: NumberPadProps) {
  return (
    <div className={styles.pad} data-testid="numberpad">
      {DIGITS.map((digit) => {
        const remaining = remainingByDigit[digit]?.remaining ?? 0;
        return (
          <button
            key={digit}
            type="button"
            className={styles.key}
            data-testid={`digit-${digit}`}
            disabled={disabled}
            onClick={() => onDigit(digit)}
          >
            <span className={styles.digit}>{digit}</span>
            {showRemaining && (
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
