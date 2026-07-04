import { AppProvider, useAppView } from './state/AppContext';
import { GameProvider } from './state/GameContext';
import GameScreen from './components/game/GameScreen';
import StatsView from './components/stats/StatsView';
import './App.css';

function ActiveView() {
  const { activeView } = useAppView();
  if (activeView === 'stats') return <StatsView />;
  return <GameScreen />;
}

export default function App() {
  return (
    <AppProvider>
      <GameProvider>
        <ActiveView />
      </GameProvider>
    </AppProvider>
  );
}
