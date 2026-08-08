import { useEffect, useState } from 'react';
import './App.css';
import { apiClient } from '@transaction-report/shared';
import { Dashboard } from './components/pages/dashboard/dashboard';
import { LoginPage } from './components/pages/login/LoginPage';
import { AcceptInvitePage } from './components/pages/acceptInvite/AcceptInvitePage';

function App() {
  const [authenticated, setAuthenticated] = useState(apiClient.isAuthenticated());
  const [inviteToken, setInviteToken] = useState(
    () => new URLSearchParams(window.location.search).get('invite')
  );

  useEffect(() => {
    const handleLogout = () => setAuthenticated(false);
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // Drops the token from the URL bar and the history entry before the dashboard renders.
  const clearInvite = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setInviteToken(null);
  };

  // Checked before the auth branch, so an invite opened while signed in still shows the
  // accept page rather than silently landing on the existing user's dashboard.
  if (inviteToken) {
    return (
      <AcceptInvitePage
        token={inviteToken}
        onAccepted={() => {
          clearInvite();
          setAuthenticated(true);
        }}
        onCancel={clearInvite}
      />
    );
  }

  if (!authenticated) {
    return <LoginPage onLoggedIn={() => setAuthenticated(true)} />;
  }

  return <Dashboard />;
}

export default App;
