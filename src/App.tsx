import { useState } from 'react';
import { getUsername } from './hooks/useUser';
import { LoginScreen } from './components/LoginScreen';
import { TerminalWindow } from './components/TerminalWindow';
import { TabBar } from './components/TabBar';
import { PersonalView } from './components/PersonalView';
import { RoomView } from './components/RoomView';
import { FilterProvider } from './hooks/FilterContext';
import type { TabType } from './types';

export function App() {
  const [loggedIn, setLoggedIn] = useState(!!getUsername());
  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    return (localStorage.getItem('vault_main_tab') as TabType) || 'personal';
  });

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    localStorage.setItem('vault_main_tab', tab);
  };

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  const username = getUsername()!;

  return (
    <FilterProvider>
      <TerminalWindow onLogout={() => setLoggedIn(false)}>
        <TabBar currentTab={currentTab} onTabChange={handleTabChange} />
        {currentTab === 'personal' ? (
          <PersonalView username={username} />
        ) : (
          <RoomView username={username} />
        )}
      </TerminalWindow>
    </FilterProvider>
  );
}
