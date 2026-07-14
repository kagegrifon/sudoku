import { AppProvider, useAppView, type Screen } from './state/AppContext';
import { SettingsProvider } from './state/SettingsContext';
import { RecordsProvider } from './state/RecordsContext';
import { GameProvider } from './state/GameContext';
import HomeScreen from './components/home/HomeScreen';
import GameScreen from './components/game/GameScreen';
import SettingsScreen from './components/settings/SettingsScreen';
import StatsView from './components/stats/StatsView';
import './App.css';

const SCREENS: Record<Screen, () => JSX.Element> = {
  home: HomeScreen,
  game: GameScreen,
  settings: SettingsScreen,
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
      <SettingsProvider>
        <RecordsProvider>
          <GameProvider>
            <ActiveScreen />
          </GameProvider>
        </RecordsProvider>
      </SettingsProvider>
    </AppProvider>
  );
}
