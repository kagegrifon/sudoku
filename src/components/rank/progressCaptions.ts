import { levelInfo, nextRankAfter } from '../../state/progress';
import { formatPoints, pointsWord } from './formatPoints';

function balanceText(total: number): string {
  return `${formatPoints(total)} ${pointsWord(total)}`;
}

/** «89 810 очков · до ур. 7: 15 190» */
export function homeProfileCaption(total: number): string {
  const info = levelInfo(total);
  return `${balanceText(total)} · до ур. ${info.level + 1}: ${formatPoints(info.pointsToNext)}`;
}

/** «89 810 очков · след. ранг: Знаток на ур. 8»; на последнем ранге — только баланс. */
export function statsProgressCaption(total: number): string {
  const nextRank = nextRankAfter(levelInfo(total).level);
  if (nextRank === null) return balanceText(total);
  return `${balanceText(total)} · след. ранг: ${nextRank.name} на ур. ${nextRank.fromLevel}`;
}
