import { useEffect, useState } from 'react';
import './App.css';
import { apiClient } from '@transaction-report/shared';
import { Dashboard } from './components/pages/dashboard/dashboard';
import { LoginPage } from './components/pages/login/LoginPage';

function App() {
  const [authenticated, setAuthenticated] = useState(apiClient.isAuthenticated());

  useEffect(() => {
    const handleLogout = () => setAuthenticated(false);
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  if (!authenticated) {
    return <LoginPage onLoggedIn={() => setAuthenticated(true)} />;
  }

  return <Dashboard />;
}

export default App;
