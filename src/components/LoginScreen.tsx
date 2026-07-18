import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/personal/watchlist';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 20) {
      setError('username must be 3-20 alphanumeric characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('username must be alphanumeric');
      return;
    }
    if (!password) {
      setError('password is required');
      return;
    }

    setBusy(true);
    try {
      await login(trimmed, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--crust)',
    }}>
      <div style={{
        border: '1px solid var(--surface-1)',
        padding: '32px',
        maxWidth: 420,
        width: '100%',
      }}>
        <div style={{
          fontSize: 18,
          color: 'var(--rosewater)',
          fontWeight: 700,
          marginBottom: 8,
          textTransform: 'lowercase',
          letterSpacing: 1,
        }}>
          {'>'} movie-vault
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--subtext-0)',
          marginBottom: 20,
        }}>
          A collaborative movie database. Enter your credentials.
        </div>
        <form onSubmit={handleSubmit}>
          <div className="terminal-prompt" style={{ fontSize: 14, marginBottom: 12 }}>
            {'>'} Username:
          </div>
          <input
            className="add-movie-input"
            type="text"
            placeholder="alphanumeric, 3-20 chars"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            autoFocus
            style={{ width: '100%', marginBottom: 12 }}
          />
          <div className="terminal-prompt" style={{ fontSize: 14, marginBottom: 12 }}>
            {'>'} Password:
          </div>
          <input
            className="add-movie-input"
            type="password"
            placeholder="enter password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            style={{ width: '100%', marginBottom: 12 }}
          />
          {error && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>
              {'>'} Error: {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'logging in...' : '> Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
