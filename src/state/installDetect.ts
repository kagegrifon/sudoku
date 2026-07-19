// Другие iOS-браузеры используют движок WebKit, но помечают себя своими токенами.
// Их надо исключить: install-инструкция «Поделиться → На экран» верна только для Safari.
const NON_SAFARI_IOS_TOKENS = ['CriOS', 'FxiOS', 'EdgiOS', 'OPiOS'];

/** true только для iOS/iPadOS Safari — по строке user-agent, без обращения к DOM. */
export function isIosSafari(userAgent: string): boolean {
  const isIosDevice = /iPhone|iPad|iPod/.test(userAgent);
  if (!isIosDevice) return false;
  const isSafariEngine = /Safari/.test(userAgent);
  if (!isSafariEngine) return false;
  const isOtherIosBrowser = NON_SAFARI_IOS_TOKENS.some((token) => userAgent.includes(token));
  return !isOtherIosBrowser;
}

/** Приложение уже запущено как установленное PWA (standalone). Обёртка над matchMedia для мокабельности. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}
