import { useEffect, useRef } from 'react';
import { createBurst, isAlive, particleAlpha, stepParticle, type BurstShape, type Particle } from './confettiPhysics';

interface FireArgs {
  shape: BurstShape;
  originX: number;
  originY: number;
}

/** Подгоняет буфер canvas под его CSS-размер с учётом плотности пикселей. */
function syncCanvasSize(canvas: HTMLCanvasElement): number {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * pixelRatio);
  const height = Math.round(canvas.clientHeight * pixelRatio);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return pixelRatio;
}

function drawParticle({ context, particle }: { context: CanvasRenderingContext2D; particle: Particle }) {
  context.save();
  context.globalAlpha = particleAlpha(particle);
  context.translate(particle.x, particle.y);
  context.rotate(particle.rotation);
  context.fillStyle = particle.color;
  context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
  context.restore();
}

/** Движок конфетти на одном canvas: частицы живут в ref, цикл rAF крутится, пока они есть. */
export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number | null>(null);

  // Читает и пишет только через refs (стабильные между рендерами), поэтому не нуждается
  // в useCallback/useMemo — пересоздание на каждый рендер безопасно и не создаёт цикл rAF заново.
  function renderFrame() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      frameRef.current = null;
      return;
    }
    const pixelRatio = syncCanvasSize(canvas);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    particlesRef.current = particlesRef.current.map(stepParticle).filter(isAlive);
    for (const particle of particlesRef.current) drawParticle({ context, particle });

    const hasParticles = particlesRef.current.length > 0;
    frameRef.current = hasParticles ? requestAnimationFrame(renderFrame) : null;
  }

  function fire({ shape, originX, originY }: FireArgs) {
    particlesRef.current = [...particlesRef.current, ...createBurst({ shape, originX, originY })];
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(renderFrame);
  }

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return { canvasRef, fire };
}
