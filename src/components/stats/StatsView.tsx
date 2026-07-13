import { useEffect, useMemo, useState } from 'react';
import type { Difficulty } from '../../core';
import { useAppView } from '../../state/AppContext';
import { getAllCompletedGames, type CompletedGame } from '../../state/storage/historyDb';
import {
  filterByPeriod,
  computeStats,
  type StatsPeriod,
  type DifficultyStats,
  type PeriodStats,
} from '../../state/statsService';
import styles from './StatsView.module.css';

const PERIODS: Array<{ id: StatsPeriod; label: string }> = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'all', label: 'Всё' },
];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
};

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '—';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatFavorite(favorite: Difficulty | null): string {
  if (favorite === null) return '—';
  return DIFFICULTY_LABELS[favorite];
}

interface MetricRowProps {
  label: string;
  value: string;
  testId: string;
}

function MetricRow({ label, value, testId }: MetricRowProps) {
  return (
    <div className={styles.metricRow}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue} data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

function DifficultyBreakdown({ stats }: { stats: PeriodStats }) {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  return (
    <div className={styles.difficultyBlock}>
      {difficulties.map((difficulty) => {
        const perDifficulty: DifficultyStats = stats.byDifficulty[difficulty];
        return (
          <div key={difficulty}>
            <h3 className={styles.difficultyTitle}>{DIFFICULTY_LABELS[difficulty]}</h3>
            <MetricRow
              label="Завершено"
              value={String(perDifficulty.completedCount)}
              testId={`stat-diff-${difficulty}-count`}
            />
            <MetricRow
              label="Лучшее время"
              value={formatSeconds(perDifficulty.bestTimeSeconds)}
              testId={`stat-diff-${difficulty}-best`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function StatsView() {
  const { goBack } = useAppView();
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const [games, setGames] = useState<CompletedGame[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getAllCompletedGames().then((loadedGames) => {
      if (active) {
        setGames(loadedGames);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const filtered = filterByPeriod(games, period, new Date());
    return computeStats(filtered);
  }, [games, period]);

  return (
    <div className={styles.screen} data-testid="stats-view">
      <button
        type="button"
        className={styles.periodButton}
        data-testid="toggle-game"
        onClick={goBack}
      >
        ← Назад
      </button>

      <div className={styles.periods}>
        {PERIODS.map((option) => {
          const isActive = option.id === period;
          const className = isActive ? styles.periodButtonActive : styles.periodButton;
          return (
            <button
              key={option.id}
              type="button"
              className={className}
              data-testid={`period-${option.id}`}
              aria-pressed={isActive}
              onClick={() => setPeriod(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {!loaded && <p>Загрузка…</p>}

      <div className={styles.metrics}>
        <MetricRow
          label="Завершено партий"
          value={String(stats.total.completedCount)}
          testId="stat-completed-count"
        />
        <MetricRow
          label="% завершённых"
          value={formatPercent(stats.completionRate)}
          testId="stat-completion-rate"
        />
        <MetricRow
          label="Лучшее время"
          value={formatSeconds(stats.total.bestTimeSeconds)}
          testId="stat-best-time"
        />
        <MetricRow
          label="Среднее время"
          value={formatSeconds(stats.total.averageTimeSeconds)}
          testId="stat-average-time"
        />
        <MetricRow
          label="Любимая сложность"
          value={formatFavorite(stats.favoriteDifficulty)}
          testId="stat-favorite-difficulty"
        />
      </div>

      <DifficultyBreakdown stats={stats} />
    </div>
  );
}
