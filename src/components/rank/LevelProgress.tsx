import { levelInfo, rankForLevel } from '../../state/progress';
import RankBadge from './RankBadge';
import styles from './LevelProgress.module.css';

const PROFILE_BADGE_SIZE = 44;

interface LevelProgressProps {
  totalScore: number;
  caption: string;
}

export default function LevelProgress({ totalScore, caption }: LevelProgressProps) {
  const info = levelInfo(totalScore);
  const rank = rankForLevel(info.level);
  const fillPercent = (info.pointsIntoLevel / info.pointsForLevel) * 100;

  return (
    <div className={styles.progress} data-testid="level-progress">
      <RankBadge rank={rank} size={PROFILE_BADGE_SIZE} />
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <span className={styles.level} data-testid="level-number">
            Уровень {info.level}
          </span>
          <span className={styles.rankName} data-testid="rank-name">
            {rank.name}
          </span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${fillPercent}%` }} />
        </div>
        <div className={styles.caption}>{caption}</div>
      </div>
    </div>
  );
}
