import type { Difficulty } from '../../core';
import styles from './DifficultyPicker.module.css';

interface DifficultyPickerProps {
  onPick(difficulty: Difficulty): void;
  onCancel(): void;
}

interface DifficultyOption {
  value: Difficulty;
  label: string;
}

const OPTIONS: DifficultyOption[] = [
  { value: 'easy', label: 'Лёгкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'hard', label: 'Сложный' },
];

export default function DifficultyPicker({ onPick, onCancel }: DifficultyPickerProps) {
  return (
    <div className={styles.overlay} data-testid="difficulty-picker" role="dialog" aria-modal="true">
      <div className={styles.card}>
        <h2 className={styles.title}>Новая игра</h2>
        <div className={styles.options}>
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.option}
              data-testid={`difficulty-${option.value}`}
              onClick={() => onPick(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.cancel}
          data-testid="difficulty-cancel"
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
