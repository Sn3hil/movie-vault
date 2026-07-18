import { Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { TerminalWindow } from './components/TerminalWindow';
import { TabBar } from './components/TabBar';
import { LoginPage } from './components/LoginScreen';
import { PersonalView } from './components/PersonalView';
import { RoomView } from './components/RoomView';
import { FilterProvider } from './hooks/FilterContext';
import { AuthProvider, ProtectedRoute } from './hooks/useAuth';

function AppLayout() {
  return (
    <FilterProvider>
      <TerminalWindow>
        <TabBar />
        <Outlet />
      </TerminalWindow>
    </FilterProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/personal/watchlist" replace />} />
            <Route path="personal">
              <Route index element={<Navigate to="/personal/watchlist" replace />} />
              <Route path=":view" element={<PersonalView />} />
            </Route>
            <Route path="room">
              <Route index element={<Navigate to="/room/watchlist" replace />} />
              <Route path=":view" element={<RoomView />} />
            </Route>
            <Route path="*" element={<Navigate to="/personal/watchlist" replace />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
