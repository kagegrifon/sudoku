import type { ReactNode } from 'react';
import type { RankId } from '../../state/progress';

/** Белые контурные глифы рангов (viewBox 24, stroke 1.8). Общие атрибуты — на <svg> в RankBadge. */
export const RANK_GLYPHS: Record<RankId, ReactNode> = {
  novice: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6z" />
      <path d="M12 11c0-4 3-7 7-7 0 4-3 7-7 7z" />
    </>
  ),
  apprentice: (
    <>
      <path d="M12 6c-2-1.5-5-2-8-1.5V18c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6z" />
      <path d="M12 6v13.5" />
    </>
  ),
  amateur: (
    <g transform="rotate(-45 12 12)">
      <path d="M6.5 4.5h8.5l3 1.8v1.4l-3 1.8H6.5z" />
      <path d="M10.8 9.5h2.4V21h-2.4z" />
    </g>
  ),
  connoisseur: (
    <>
      <path d="M2 9l10-4 10 4-10 4z" />
      <path d="M6 11v4c0 1.5 3 3 6 3s6-1.5 6-3v-4" />
      <path d="M22 9v5" />
    </>
  ),
  expert: (
    <>
      <path d="M7 4h10l4 5-9 11L3 9z" />
      <path d="M3 9h18M12 20 8.5 9 10 4M12 20l3.5-11L14 4" />
    </>
  ),
  master: (
    <>
      <path d="M8 3l2.5 6M16 3l-2.5 6" />
      <circle cx="12" cy="15" r="5.5" />
      <path
        d="M12 12.5l.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2z"
        fill="#fff"
      />
    </>
  ),
  grandmaster: <path d="M4 18h16M4.5 16 3 7l5 4 4-6 4 6 5-4-1.5 9z" />,
};
