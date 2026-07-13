import { useState } from 'react';
import type { Difficulty } from '../../core';
import { useSettings } from '../../state/SettingsContext';
import { useRecords } from '../../state/RecordsContext';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../difficultyLabels';
import { formatTime } from '../header/formatTime';
import styles from './DifficultyPicker.module.css';

interface DifficultyPickerProps {
  onStart(difficulty: Difficulty): void;
  onClose(): void;
}

const OPTIONS: Difficulty[] = ['easy', 'medium', 'hard'];

export default function DifficultyPicker({ onStart, onClose }: DifficultyPickerProps) {
  const { lastDifficulty } = useSettings();
  const { records } = useRecords();
  const [selected, setSelected] = useState<Difficulty>(lastDifficulty);

  return (
    <div className={styles.overlay} data-testid="difficulty-picker" role="dialog" aria-modal="true">
      <button type="button" className={styles.backdrop} aria-label="Закрыть" onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <h2 className={styles.title}>Новая игра</h2>

        <div className={styles.options}>
          {OPTIONS.map((difficulty) => {
            const isSelected = difficulty === selected;
            const record = records[difficulty];
            const recordText = record === null ? 'Ещё нет рекорда' : `Рекорд ${formatTime(record)}`;
            return (
              <button
                key={difficulty}
                type="button"
                className={isSelected ? styles.optionSelected : styles.option}
                data-testid={`difficulty-${difficulty}`}
                aria-pressed={isSelected}
                onClick={() => setSelected(difficulty)}
              >
                <span
                  className={styles.stripe}
                  style={{ background: DIFFICULTY_COLORS[difficulty] }}
                />
                <span className={styles.optionText}>
                  <span className={styles.optionName}>{DIFFICULTY_LABELS[difficulty]}</span>
                  <span
                    className={styles.optionRecord}
                    data-testid={`difficulty-record-${difficulty}`}
                  >
                    {recordText}
                  </span>
                </span>
                <span className={styles.marker}>{isSelected ? '●' : '›'}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.startButton}
          data-testid="difficulty-start"
          onClick={() => onStart(selected)}
        >
          Начать
        </button>
      </div>
    </div>
  );
}
