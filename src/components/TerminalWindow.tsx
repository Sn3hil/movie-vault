import { clearUsername, getUsername } from '../hooks/useUser';

interface TerminalWindowProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export function TerminalWindow({ children, onLogout }: TerminalWindowProps) {
  const username = getUsername();

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <div className="terminal-dots">
          <div className="terminal-dot red" />
          <div className="terminal-dot yellow" />
          <div className="terminal-dot green" />
        </div>
        <div className="terminal-title">movie-vault — {username || 'anonymous'}</div>
        <div className="terminal-close">{'\u2716'}</div>
      </div>
      <div className="terminal-content">
        {children}
      </div>
      <div className="terminal-statusbar">
        <span>
          user: <span style={{ color: 'var(--green)' }}>{username}</span>
        </span>
        <span className="switch-user-btn" onClick={() => { clearUsername(); onLogout(); }}>
          switch user
        </span>
      </div>
    </div>
  );
}
