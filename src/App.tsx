import { useState } from 'react';
import { getUsername } from './hooks/useUser';
import { LoginScreen } from './components/LoginScreen';
import { TerminalWindow } from './components/TerminalWindow';
import { TabBar } from './components/TabBar';
import { PersonalView } from './components/PersonalView';
import { RoomView } from './components/RoomView';
import type { TabType } from './types';

export function App() {
  const [loggedIn, setLoggedIn] = useState(!!getUsername());
  const [currentTab, setCurrentTab] = useState<TabType>('personal');

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  const username = getUsername()!;

  return (
    <TerminalWindow onLogout={() => setLoggedIn(false)}>
      <TabBar currentTab={currentTab} onTabChange={setCurrentTab} />
      {currentTab === 'personal' ? (
        <PersonalView username={username} />
      ) : (
        <RoomView username={username} />
      )}
    </TerminalWindow>
  );
}
