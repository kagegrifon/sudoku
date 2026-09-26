import { useRef } from 'react';
import type { Difficulty } from '../../core';
import { INITIAL_LIVES } from '../../state/gameTypes';
import { DIFFICULTY_LABELS } from '../difficultyLabels';
import { formatTime } from '../header/formatTime';
import { useCountUp } from '../../hooks/useCountUp';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { BURST_SHAPES } from '../confetti/confettiPhysics';
import { useConfetti } from '../confetti/useConfetti';
import confettiStyles from '../confetti/ConfettiCanvas.module.css';
import { useWinSequence } from './useWinSequence';
import { WIN_TIMINGS, type WinEffect } from './winSequence';
import { BurnedScore, WonScore } from './WinScore';
import WinProgress from './WinProgress';
import styles from './WinScreen.module.css';

export interface WinScoreSummary {
  score: number;
  prevTotalScore: number;
  nextTotalScore: number;
  isNewScoreRecord: boolean;
}

// Без scoreSummary (старые вызовы и тесты) блоки очков не рисуются.
const EMPTY_SCORE_SUMMARY: WinScoreSummary = {
  score: 0,
  prevTotalScore: 0,
  nextTotalScore: 0,
  isNewScoreRecord: false,
};

interface WinScreenProps {
  result: 'won' | 'lost';
  elapsedSeconds: number;
  difficulty: Difficulty;
  livesLeft: number;
  isNewRecord: boolean;
  scoreSummary?: WinScoreSummary;
  onNewGame(): void;
  onHome(): void;
}

const HEART_SLOTS = Array.from({ length: INITIAL_LIVES }, (_, index) => index);

const CONTENT: Record<
  'won' | 'lost',
  { icon: string; title: string; subtitle: string; testid: string }
> = {
  won: { icon: '✓', title: 'Готово!', subtitle: 'Судоку решено верно', testid: 'win-screen-won' },
  lost: {
    icon: '✕',
    title: 'Игра окончена',
    subtitle: 'Закончились жизни',
    testid: 'win-screen-lost',
  },
};

function centerOf(element: HTMLElement | null): { originX: number; originY: number } | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { originX: rect.left + rect.width / 2, originY: rect.top + rect.height / 2 };
}

export default function WinScreen({
  result,
  elapsedSeconds,
  difficulty,
  livesLeft,
  isNewRecord,
  scoreSummary,
  onNewGame,
  onHome,
}: WinScreenProps) {
  const content = CONTENT[result];
  const iconClass = result === 'won' ? styles.iconWon : styles.iconLost;
  const summary = scoreSummary ?? EMPTY_SCORE_SUMMARY;
  const reducedMotion = usePrefersReducedMotion();
  const { canvasRef, fire } = useConfetti();
  const badgeRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);

  const effectHandlers: Record<WinEffect, () => void> = {
    winBurst: () => {
      const bottom = window.innerHeight;
      fire({ shape: BURST_SHAPES.winLeft, originX: 0, originY: bottom });
      fire({ shape: BURST_SHAPES.winRight, originX: window.innerWidth, originY: bottom });
    },
    levelBurst: () => {
      const origin = centerOf(levelRef.current);
      if (origin) fire({ shape: BURST_SHAPES.levelUp, ...origin });
    },
    rankBurst: () => {
      const origin = centerOf(badgeRef.current);
      if (origin) fire({ shape: BURST_SHAPES.rankUp, ...origin });
    },
  };

  const { view, skip } = useWinSequence({
    result,
    prevTotalScore: summary.prevTotalScore,
    nextTotalScore: summary.nextTotalScore,
    reducedMotion,
    onEffect: (effect) => effectHandlers[effect](),
  });

  const countUpTarget = view.scoreCounting || view.finished ? summary.score : 0;
  const shownScore = useCountUp({
    target: countUpTarget,
    durationMs: WIN_TIMINGS.countUpMs,
    enabled: !view.finished,
  });

  const hasScore = scoreSummary !== undefined;
  const showScoreRecord = hasScore && summary.isNewScoreRecord;
  const scoreBadgeClass = view.scoreBadgeShown ? styles.recordBadge : `${styles.recordBadge} ${styles.hidden}`;
  const timeBadgeClass = view.timeBadgeShown ? styles.recordBadge : `${styles.recordBadge} ${styles.hidden}`;

  return (
    <div className={styles.overlay} data-testid="win-screen" role="dialog" aria-modal="true">
      <canvas ref={canvasRef} className={confettiStyles.canvas} aria-hidden="true" />
      <div className={styles.card} data-testid={content.testid} onClick={skip}>
        <div className={iconClass}>{content.icon}</div>
        <div className={styles.title}>{content.title}</div>
        <div className={styles.subtitle}>{content.subtitle}</div>

        {hasScore && result === 'won' && <WonScore shownScore={shownScore} popped={view.scorePopped} />}
        {hasScore && result === 'lost' && <BurnedScore score={summary.score} />}

        <div className={styles.badges}>
          {showScoreRecord && (
            <div className={scoreBadgeClass} data-testid="score-record-badge">
              ★ Рекорд очков
            </div>
          )}
          {isNewRecord && (
            <div className={timeBadgeClass} data-testid="new-record-badge">
              ★ Новый рекорд
            </div>
          )}
        </div>

        {hasScore && (
          <WinProgress
            view={view}
            nextTotalScore={summary.nextTotalScore}
            badgeRef={badgeRef}
            levelRef={levelRef}
          />
        )}

        <div className={styles.stats}>
          <div className={styles.statCell}>
            <div className={styles.statLabel}>Время</div>
            <div className={styles.statTime}>{formatTime(elapsedSeconds)}</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statLabel}>Уровень</div>
            <div className={styles.statValue}>{DIFFICULTY_LABELS[difficulty]}</div>
          </div>
          <div className={styles.statCellLast}>
            <div className={styles.statLabel}>Жизни</div>
            <div className={styles.statHearts}>
              {HEART_SLOTS.map((slot) => (
                <span
                  key={slot}
                  className={slot < livesLeft ? styles.heartFull : styles.heartEmpty}
                >
                  ♥
                </span>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.newGame}
          data-testid="win-new-game"
          onClick={onNewGame}
        >
          Новая игра
        </button>
        <button type="button" className={styles.home} data-testid="win-home" onClick={onHome}>
          На главную
        </button>
      </div>
    </div>
  );
}
