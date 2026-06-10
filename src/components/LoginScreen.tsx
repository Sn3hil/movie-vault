import { useState } from 'react';
import { setUsername } from '../hooks/useUser';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();

    if (!trimmed || trimmed.length < 3 || trimmed.length > 20) {
      setError('username must be 3-20 alphanumeric characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('username must be alphanumeric');
      return;
    }

    setUsername(trimmed);
    onLogin();
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
          A collaborative movie database. Enter a username to get started.
        </div>
        <form onSubmit={handleSubmit}>
          <div className="terminal-prompt" style={{ fontSize: 14, marginBottom: 12 }}>
            {'>'} Enter username: <span className="cursor" />
          </div>
          <input
            className="add-movie-input"
            type="text"
            placeholder="alphanumeric, 3-20 chars"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            autoFocus
            style={{ width: '100%', marginBottom: 12 }}
          />
          {error && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>
              {'>'} Error: {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {'>'} Enter
          </button>
        </form>
      </div>
    </div>
  );
}
