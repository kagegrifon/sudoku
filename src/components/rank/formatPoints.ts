const THOUSANDS_GROUP = /\B(?=(\d{3})+(?!\d))/g;
const NARROW_GAP = ' ';

/** 21640 → «21 640» (неразрывный пробел — число не переносится). */
export function formatPoints(points: number): string {
  return String(Math.round(points)).replace(THOUSANDS_GROUP, NARROW_GAP);
}

const POINTS_PLURAL = new Intl.PluralRules('ru-RU');

const POINTS_WORDS: Record<Intl.LDMLPluralRule, string> = {
  zero: 'очков',
  one: 'очко',
  two: 'очка',
  few: 'очка',
  many: 'очков',
  other: 'очка',
};

export function pointsWord(count: number): string {
  return POINTS_WORDS[POINTS_PLURAL.select(count)];
}
