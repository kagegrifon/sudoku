import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function canQueryMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function readPreference(): boolean {
  if (!canQueryMedia()) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Пользователь попросил меньше анимации — отключаем набегание, всплывашки и конфетти. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPreference);

  useEffect(() => {
    if (!canQueryMedia()) return;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
