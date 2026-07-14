import { useEffect, useMemo, useState } from 'react';
import type { Difficulty } from '../../core';
import { useAppView } from '../../state/AppContext';
import { getAllCompletedGames, type CompletedGame } from '../../state/storage/historyDb';
import { filterByPeriod, computeStats, type StatsPeriod } from '../../state/statsService';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../difficultyLabels';
import { formatTime } from '../header/formatTime';
import styles from './StatsView.module.css';

const PERIODS: Array<{ id: StatsPeriod; label: string }> = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'all', label: 'Всё' },
];

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '—';
  return formatTime(seconds);
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatFavorite(favorite: Difficulty | null): string {
  if (favorite === null) return '—';
  return DIFFICULTY_LABELS[favorite];
}

interface SummaryCardProps {
  label: string;
  value: string;
  valueClass?: string;
  testId: string;
}

function SummaryCard({ label, value, valueClass, testId }: SummaryCardProps) {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={valueClass ?? styles.summaryValue} data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

interface DifficultyRowProps {
  difficulty: Difficulty;
  wins: number;
  bestTimeSeconds: number | null;
}

function DifficultyRow({ difficulty, wins, bestTimeSeconds }: DifficultyRowProps) {
  return (
    <div className={styles.diffRow}>
      <div className={styles.diffLeft}>
        <span className={styles.diffStripe} style={{ background: DIFFICULTY_COLORS[difficulty] }} />
        <span className={styles.diffName}>{DIFFICULTY_LABELS[difficulty]}</span>
      </div>
      <div className={styles.diffRight}>
        <div className={styles.diffBest} data-testid={`stat-diff-${difficulty}-best`}>
          {formatSeconds(bestTimeSeconds)}
        </div>
        <div className={styles.diffWins} data-testid={`stat-diff-${difficulty}-wins`}>
          {wins} побед
        </div>
      </div>
    </div>
  );
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

  const { stats, totalGames } = useMemo(() => {
    const filtered = filterByPeriod(games, period, new Date());
    return { stats: computeStats(filtered), totalGames: filtered.length };
  }, [games, period]);

  return (
    <div className={styles.screen} data-testid="stats-view">
      <div className={styles.header}>
        <button type="button" className={styles.back} data-testid="stats-back" onClick={goBack}>
          ‹
        </button>
        <h1 className={styles.title}>Статистика</h1>
      </div>

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

      {!loaded && <p className={styles.loading}>Загрузка…</p>}

      <div className={styles.summaryRow}>
        <SummaryCard
          label="Любимая сложность"
          value={formatFavorite(stats.favoriteDifficulty)}
          testId="stat-favorite-difficulty"
        />
        <SummaryCard
          label="Всего партий"
          value={String(totalGames)}
          valueClass={styles.summaryValueBig}
          testId="stat-total-games"
        />
      </div>

      <div className={styles.diffCard}>
        {DIFFICULTIES.map((difficulty) => (
          <DifficultyRow
            key={difficulty}
            difficulty={difficulty}
            wins={stats.byDifficulty[difficulty].completedCount}
            bestTimeSeconds={stats.byDifficulty[difficulty].bestTimeSeconds}
          />
        ))}
      </div>

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
      </div>
    </div>
  );
}
