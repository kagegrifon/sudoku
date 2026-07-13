import { AppProvider, useAppView, type Screen } from './state/AppContext';
import { GameProvider } from './state/GameContext';
import GameScreen from './components/game/GameScreen';
import StatsView from './components/stats/StatsView';
import './App.css';

// Заглушки для home/settings — заменяются настоящими экранами в Phase 5.
function HomePlaceholder() {
  const { navigate } = useAppView();
  return (
    <div data-testid="home-screen">
      <button type="button" data-testid="home-new-game" onClick={() => navigate('game')}>
        Новая игра
      </button>
      <button type="button" data-testid="home-stats" onClick={() => navigate('stats')}>
        Статистика
      </button>
      <button type="button" data-testid="home-settings" onClick={() => navigate('settings')}>
        Настройки
      </button>
    </div>
  );
}

function SettingsPlaceholder() {
  const { goBack } = useAppView();
  return (
    <div data-testid="settings-screen">
      <button type="button" data-testid="settings-back" onClick={goBack}>
        ‹ назад
      </button>
    </div>
  );
}

const SCREENS: Record<Screen, () => JSX.Element> = {
  home: HomePlaceholder,
  game: GameScreen,
  settings: SettingsPlaceholder,
  stats: StatsView,
};

function ActiveScreen() {
  const { screen } = useAppView();
  const Screen = SCREENS[screen];
  return <Screen />;
}

export default function App() {
  return (
    <AppProvider>
      <GameProvider>
        <ActiveScreen />
      </GameProvider>
    </AppProvider>
  );
}
