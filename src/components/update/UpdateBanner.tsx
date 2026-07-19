import { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { useAppUpdate } from '../../state/appUpdate';
import styles from './UpdateBanner.module.css';

/**
 * Независимый оверлей (не экран дизайна). При готовности новой версии SW показывает
 * баннер. Крестик скрывает баннер локально, но updateAvailable остаётся true —
 * тогда обновиться можно кнопкой «Обновить» в настройках (design §5, ADR-0004).
 */
export default function UpdateBanner() {
  const game = useGame();
  const { updateAvailable, applyUpdate } = useAppUpdate(() => game.state);
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className={styles.banner} role="status" data-testid="update-banner">
      <span className={styles.text}>Доступно обновление</span>
      <button
        type="button"
        className={styles.apply}
        data-testid="update-banner-apply"
        onClick={applyUpdate}
      >
        Обновить
      </button>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Закрыть"
        data-testid="update-banner-dismiss"
        onClick={() => setDismissed(true)}
      >
        ✕
      </button>
    </div>
  );
}
