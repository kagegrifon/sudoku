import { AppProvider } from './state/AppContext';
import { GameProvider } from './state/GameContext';
import GameScreen from './components/game/GameScreen';
import './App.css';

export default function App() {
  return (
    <AppProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </AppProvider>
  );
}
