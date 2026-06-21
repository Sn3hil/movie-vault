import { useState, useEffect, useRef } from 'react';
import { clearUsername, getUsername } from '../hooks/useUser';
import { useFilter, type SortBy, type SortOrder } from '../hooks/FilterContext';

interface TerminalWindowProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const sortByCycle: SortBy[] = ['name', 'rating', 'year', 'added'];

function sortLabel(by: SortBy): string {
  return by === 'added' ? 'added' : by;
}

export function TerminalWindow({ children, onLogout }: TerminalWindowProps) {
  const username = getUsername();
  const { search, setSearch, filterLabel, sortBy, setSortBy, sortOrder, setSortOrder } = useFilter();
  const [showSort, setShowSort] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSort(false);
      }
    }
    if (showSort) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showSort]);

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
        <div className="statusbar-filter">
          <input
            className="statusbar-filter-input"
            type="text"
            placeholder="Filter list..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filterLabel && (
            <span className="statusbar-filter-label">{filterLabel}</span>
          )}
          <div className="sort-group" ref={sortRef}>
            <button
              className="sort-btn sort-btn-param"
              onClick={() => {
                const idx = sortByCycle.indexOf(sortBy);
                setSortBy(sortByCycle[(idx + 1) % sortByCycle.length]);
              }}
            >
              {sortLabel(sortBy)}
            </button>
            <button
              className="sort-btn sort-btn-order"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '\u2191' : '\u2193'}
            </button>
          </div>
        </div>
        <span className="switch-user-btn" onClick={() => { clearUsername(); onLogout(); }}>
          switch user
        </span>
      </div>
    </div>
  );
}
