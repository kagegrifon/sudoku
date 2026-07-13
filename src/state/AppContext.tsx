/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

export type Screen = 'home' | 'game' | 'settings' | 'stats';

interface NavState {
  screen: Screen;
  previous: Screen | null;
}

type NavAction = { type: 'navigate'; to: Screen } | { type: 'goBack' };

function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'navigate':
      if (action.to === state.screen) return state;
      return { screen: action.to, previous: state.screen };
    case 'goBack': {
      const target = state.previous ?? 'home';
      return { screen: target, previous: state.screen };
    }
    default:
      return state;
  }
}

interface AppContextValue {
  screen: Screen;
  previous: Screen | null;
  navigate(to: Screen): void;
  goBack(): void;
}

const AppContext = createContext<AppContextValue | null>(null);

const INITIAL_NAV: NavState = { screen: 'home', previous: null };

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(navReducer, INITIAL_NAV);
  const value = useMemo<AppContextValue>(
    () => ({
      screen: state.screen,
      previous: state.previous,
      navigate: (to) => dispatch({ type: 'navigate', to }),
      goBack: () => dispatch({ type: 'goBack' }),
    }),
    [state],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppView(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppView должен использоваться внутри AppProvider');
  return context;
}
