import type { CSSProperties } from 'react';
import type { Rank } from '../../state/progress';
import { RANK_GLYPHS } from './rankGlyphs';
import styles from './RankBadge.module.css';

interface RankBadgeProps {
  rank: Rank;
  /** Диаметр круга в px: 48 — экран победы, 44 — главный и статистика. */
  size: number;
}

export default function RankBadge({ rank, size }: RankBadgeProps) {
  const circleStyle = { '--rank-color': rank.color, '--badge-size': `${size}px` } as CSSProperties;
  return (
    <div
      className={styles.badge}
      style={circleStyle}
      data-testid="rank-badge"
      data-rank={rank.id}
      role="img"
      aria-label={`Ранг: ${rank.name}`}
    >
      <svg
        className={styles.glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {RANK_GLYPHS[rank.id]}
      </svg>
    </div>
  );
}
