import { describe, it, expect } from 'vitest';
import {
  BURST_SHAPES,
  CONFETTI_PALETTE,
  PARTICLE_LIFETIME_FRAMES,
  createBurst,
  isAlive,
  particleAlpha,
  stepParticle,
  type Particle,
} from './confettiPhysics';

function particle(overrides: Partial<Particle> = {}): Particle {
  return { x: 0, y: 0, vx: 0, vy: 0, rotation: 0, spin: 0.1, width: 6, height: 8, color: '#fff', life: 0, ...overrides };
}

describe('stepParticle', () => {
  it('гравитация 0.18 за кадр', () => {
    const next = stepParticle(particle());
    expect(next.vy).toBeCloseTo(0.18);
    expect(next.y).toBeCloseTo(0.18);
    expect(next.life).toBe(1);
  });

  it('затухание скорости ×0.985', () => {
    expect(stepParticle(particle({ vx: 10 })).vx).toBeCloseTo(9.85);
  });

  it('покачивание sin(life / 8) × 0.6 смещает x', () => {
    const life = 12;
    const next = stepParticle(particle({ life }));
    expect(next.x).toBeCloseTo(Math.sin(life / 8) * 0.6);
  });

  it('вращение накапливается', () => {
    expect(stepParticle(particle({ rotation: 1, spin: 0.2 })).rotation).toBeCloseTo(1.2);
  });

  it('не мутирует исходную частицу', () => {
    const original = particle();
    stepParticle(original);
    expect(original.life).toBe(0);
  });
});

describe('жизнь частицы', () => {
  it('alpha угасает линейно к концу жизни', () => {
    expect(particleAlpha(particle({ life: 0 }))).toBe(1);
    expect(particleAlpha(particle({ life: PARTICLE_LIFETIME_FRAMES / 2 }))).toBeCloseTo(0.5);
  });

  it('живёт 260 кадров', () => {
    expect(isAlive(particle({ life: 259 }))).toBe(true);
    expect(isAlive(particle({ life: 260 }))).toBe(false);
  });
});

describe('createBurst', () => {
  const middle = () => 0.5;

  it('залп победы: 45 частиц из точки старта под −60°', () => {
    const burst = createBurst({ shape: BURST_SHAPES.winLeft, originX: 0, originY: 800, random: middle });
    expect(burst).toHaveLength(45);
    expect(burst.every((item) => item.x === 0 && item.y === 800)).toBe(true);
    // скорость 15 (середина 12–18), угол −60°
    expect(burst[0].vx).toBeCloseTo(7.5);
    expect(burst[0].vy).toBeCloseTo(-15 * Math.sin(Math.PI / 3));
  });

  it('размеры 5–10 px и цвета из палитры', () => {
    const burst = createBurst({ shape: BURST_SHAPES.rankUp, originX: 10, originY: 10 });
    expect(burst).toHaveLength(70);
    for (const item of burst) {
      expect(item.width).toBeGreaterThanOrEqual(5);
      expect(item.width).toBeLessThanOrEqual(10);
      expect(CONFETTI_PALETTE).toContain(item.color);
    }
  });

  it('залп уровня — 30 частиц', () => {
    expect(createBurst({ shape: BURST_SHAPES.levelUp, originX: 0, originY: 0 })).toHaveLength(30);
  });
});
