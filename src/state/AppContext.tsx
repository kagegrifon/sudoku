/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type ActiveView = 'game' | 'stats';

interface AppContextValue {
  activeView: ActiveView;
  setActiveView(view: ActiveView): void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ActiveView>('game');
  const value = useMemo(() => ({ activeView, setActiveView }), [activeView]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppView(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppView должен использоваться внутри AppProvider');
  return context;
}
