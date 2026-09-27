export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  width: number;
  height: number;
  color: string;
  life: number;
}

export const CONFETTI_PALETTE = [
  '#2f6fed',
  '#37b26b',
  '#e8a23a',
  '#e05a5a',
  '#7b5cf0',
  '#12a4b6',
  '#f5c542',
] as const;

export const PARTICLE_LIFETIME_FRAMES = 260;
const GRAVITY = 0.18;
const AIR_DRAG = 0.985;
const WOBBLE_AMPLITUDE = 0.6;
const WOBBLE_PERIOD_FRAMES = 8;
const MIN_SIDE_PX = 5;
const SIDE_SPREAD_PX = 5;
const MAX_SPIN = 0.3;

/** Один кадр физики: затухание, гравитация, покачивание, вращение. Чистая функция. */
export function stepParticle(particle: Particle): Particle {
  const vx = particle.vx * AIR_DRAG;
  const vy = particle.vy * AIR_DRAG + GRAVITY;
  const wobble = Math.sin(particle.life / WOBBLE_PERIOD_FRAMES) * WOBBLE_AMPLITUDE;
  return {
    ...particle,
    vx,
    vy,
    x: particle.x + vx + wobble,
    y: particle.y + vy,
    rotation: particle.rotation + particle.spin,
    life: particle.life + 1,
  };
}

export function particleAlpha(particle: Particle): number {
  return Math.max(0, 1 - particle.life / PARTICLE_LIFETIME_FRAMES);
}

export function isAlive(particle: Particle): boolean {
  return particle.life < PARTICLE_LIFETIME_FRAMES;
}

export interface BurstShape {
  count: number;
  /** Направление залпа, рад; −π/2 — строго вверх (ось y экрана направлена вниз). */
  angle: number;
  /** Полный разброс угла, рад. */
  spread: number;
  minSpeed: number;
  maxSpeed: number;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

const STRAIGHT_UP = -Math.PI / 2;
const WIN_SPREAD = 0.5;

/** Параметры залпов из макета. «Мощность» P → скорость от P/2 до P. */
export const BURST_SHAPES = {
  winLeft: { count: 45, angle: degreesToRadians(-60), spread: WIN_SPREAD, minSpeed: 12, maxSpeed: 18 },
  winRight: { count: 45, angle: degreesToRadians(-120), spread: WIN_SPREAD, minSpeed: 12, maxSpeed: 18 },
  levelUp: { count: 30, angle: STRAIGHT_UP, spread: 1.6, minSpeed: 3.5, maxSpeed: 7 },
  rankUp: { count: 70, angle: STRAIGHT_UP, spread: 2.4, minSpeed: 5, maxSpeed: 10 },
} satisfies Record<string, BurstShape>;

interface CreateBurstArgs {
  shape: BurstShape;
  originX: number;
  originY: number;
  /** Источник случайности; подменяется в тестах. */
  random?: () => number;
}

export function createBurst({ shape, originX, originY, random = Math.random }: CreateBurstArgs): Particle[] {
  return Array.from({ length: shape.count }, (_, index) => {
    const angle = shape.angle + (random() - 0.5) * shape.spread;
    const speed = shape.minSpeed + random() * (shape.maxSpeed - shape.minSpeed);
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: random() * Math.PI * 2,
      spin: (random() - 0.5) * MAX_SPIN,
      width: MIN_SIDE_PX + random() * SIDE_SPREAD_PX,
      height: MIN_SIDE_PX + random() * SIDE_SPREAD_PX,
      color: CONFETTI_PALETTE[index % CONFETTI_PALETTE.length],
      life: 0,
    };
  });
}
