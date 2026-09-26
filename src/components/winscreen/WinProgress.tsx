import type { Ref } from 'react';
import { levelInfo, rankById } from '../../state/progress';
import RankBadge from '../rank/RankBadge';
import { formatPoints } from '../rank/formatPoints';
import { BAR_TRANSITIONS, type WinView } from './winSequence';
import styles from './WinScreen.module.css';

const WIN_BADGE_SIZE = 48;

interface WinProgressProps {
  view: WinView;
  nextTotalScore: number;
  badgeRef: Ref<HTMLDivElement>;
  levelRef: Ref<HTMLDivElement>;
}

export default function WinProgress({ view, nextTotalScore, badgeRef, levelRef }: WinProgressProps) {
  const rank = rankById(view.rankId);
  const finalInfo = levelInfo(nextTotalScore);
  const blockClass = view.progressShown ? styles.progress : `${styles.progress} ${styles.hidden}`;
  const badgeClass = view.rankSwapCount > 0 ? styles.rankSwap : undefined;
  const levelClass = view.levelPopCount > 0 ? styles.levelPop : undefined;
  const fillClass = view.flash ? `${styles.barFill} ${styles.barFlash}` : styles.barFill;
  const fillStyle = {
    width: `${view.barFraction * 100}%`,
    transition: BAR_TRANSITIONS[view.barTransition],
  };
  const caption = `${formatPoints(finalInfo.pointsIntoLevel)} / ${formatPoints(finalInfo.pointsForLevel)} до ур. ${finalInfo.level + 1}`;

  return (
    <div className={blockClass} data-testid="win-progress">
      <div className={styles.progressHead}>
        {/* key перезапускает CSS-анимацию на каждом событии */}
        <div key={`badge-${view.rankSwapCount}`} ref={badgeRef} className={badgeClass}>
          <RankBadge rank={rank} size={WIN_BADGE_SIZE} />
        </div>
        <div className={styles.progressTitle}>
          <div key={`level-${view.levelPopCount}`} ref={levelRef} className={levelClass} data-testid="level-number">
            Уровень {view.level}
          </div>
          <div className={styles.progressRank} data-testid="rank-name">
            {rank.name}
          </div>
        </div>
      </div>
      <div className={styles.barTrack}>
        <div className={fillClass} style={fillStyle} />
      </div>
      {view.finished && <div className={styles.progressCaption}>{caption}</div>}
      {view.newRankName && (
        <div className={styles.newRank} data-testid="new-rank">
          Новый ранг: {view.newRankName}
        </div>
      )}
    </div>
  );
}
