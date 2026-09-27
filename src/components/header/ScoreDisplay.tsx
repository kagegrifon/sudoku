import { useGame } from '../../state/GameContext';
import { useCountUp } from '../../hooks/useCountUp';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { formatPoints } from '../rank/formatPoints';
import styles from './ScoreDisplay.module.css';

const COUNT_UP_MS = 450;

type ScorePulse = 'gain' | 'loss';

const PULSE_CLASSES: Record<ScorePulse, string> = {
  gain: styles.bump,
  loss: styles.hurt,
};

function pulseForDelta(delta: number): ScorePulse {
  return delta < 0 ? 'loss' : 'gain';
}

export default function ScoreDisplay() {
  const { state } = useGame();
  const reducedMotion = usePrefersReducedMotion();
  const shownScore = useCountUp({
    target: state.score,
    durationMs: COUNT_UP_MS,
    enabled: !reducedMotion,
  });

  const event = state.lastScoreEvent;
  const showPulse = event !== null && !reducedMotion;
  const pulseClass = showPulse ? PULSE_CLASSES[pulseForDelta(event.delta)] : '';
  // key по id события перезапускает CSS-анимацию пульса на каждом изменении счёта.
  const pulseKey = event?.id ?? 0;

  return (
    <div className={styles.score}>
      <div className={styles.label}>Очки</div>
      <div key={pulseKey} className={`${styles.value} ${pulseClass}`} data-testid="game-score">
        {formatPoints(shownScore)}
      </div>
    </div>
  );
}
