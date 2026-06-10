import { useState, useRef, useCallback, useEffect } from 'react';
import type { MovieSearchResult } from '../types';

interface AddMovieFormProps {
  placeholder?: string;
  onAdd: (result: MovieSearchResult) => void;
  existingIds?: Set<string>;
}

export function AddMovieForm({ placeholder = 'Search...', onAdd, existingIds }: AddMovieFormProps) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<MovieSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll the keyboard-selected item into view whenever selectedIndex changes
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]!.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      if (res.status === 501) {
        setSuggestions([]);
        setShowSuggestions(false);
        setError('TMDB is not configured on the server');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as any).error || 'Search failed');
        return;
      }
      setError(null);
      const results: MovieSearchResult[] = await res.json();
      setSuggestions(results.slice(0, 5));
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1); // reset keyboard selection on every new result set
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Network error — check server connection');
    }
  }, []);

  function handleChange(val: string) {
    setValue(val);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim()) {
      debounceRef.current = setTimeout(() => doSearch(val), 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  // Manual form submit is a no-op — user must pick a TMDB suggestion.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
  }

  function tmdbUrl(result: MovieSearchResult): string {
    return `https://www.themoviedb.org/${result.media_type}/${result.id}`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === ' ' && selectedIndex >= 0) {
      // Spacebar adds the highlighted suggestion — only when one is keyboard-selected and not already added
      const suggestion = suggestions[selectedIndex];
      const isAdded = existingIds?.has(`${suggestion.media_type}-${suggestion.id}`);
      if (isAdded) return;

      e.preventDefault();
      onAdd(suggestion);
      // Keep dropdown open and focus on input for rapid multi-add
      inputRef.current?.focus();
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      // Enter opens the TMDB page for the highlighted suggestion
      e.preventDefault();
      window.open(tmdbUrl(suggestions[selectedIndex]), '_blank');
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }

  // Clicking the "+" button: prevent the button from stealing focus from the input,
  // call onAdd, then immediately return focus to the input so the dropdown stays open.
  function handleAddQuick(result: MovieSearchResult, e: React.MouseEvent) {
    e.stopPropagation();
    onAdd(result);
    // Return focus to input without clearing — user can keep adding
    inputRef.current?.focus();
  }

  function handleCardClick(result: MovieSearchResult) {
    window.open(tmdbUrl(result), '_blank');
  }

  return (
    <div className="add-movie-form">
      <form onSubmit={handleSubmit} className="add-movie-row">
        <span className="terminal-prompt" style={{ fontSize: 13 }}>
          {'>'} Search:
        </span>
        <input
          ref={inputRef}
          className="add-movie-input"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </form>
      {error && !showSuggestions && (
        <div className="suggestion-error">{error}</div>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions" ref={suggestionsRef}>
          {suggestions.map((result, i) => (
            <div
              key={`${result.media_type}-${result.id}`}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={`suggestion-item${i === selectedIndex ? ' suggestion-item--selected' : ''}`}
              onClick={() => handleCardClick(result)}
              style={existingIds?.has(`${result.media_type}-${result.id}`) ? { opacity: 0.7 } : {}}
            >
              {result.poster_path ? (
                <img src={`https://image.tmdb.org/t/p/w92${result.poster_path}`} alt="" />
              ) : (
                <span style={{ width: 28, height: 42, border: '1px solid var(--surface-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--overlay-0)', flexShrink: 0 }}>N/A</span>
              )}
              <span className="suggestion-title">
                {result.title}
                {existingIds?.has(`${result.media_type}-${result.id}`) && (
                  <span style={{ fontSize: 9, color: 'var(--overlay-0)', marginLeft: 6 }}>(added)</span>
                )}
              </span>
              <span className="suggestion-year">
                {result.release_date ? `(${result.release_date.slice(0, 4)})` : ''}
              </span>
              {result.media_type === 'tv' && (
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--blue)', color: '#fff', marginLeft: 4, fontWeight: 600, flexShrink: 0 }}>TV</span>
              )}
              {!existingIds?.has(`${result.media_type}-${result.id}`) && (
                <button
                  className="suggestion-add"
                  // onMouseDown prevents the button from stealing focus from the input
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleAddQuick(result, e)}
                >
                  +
                </button>
              )}
            </div>
          ))}
          <div style={{ padding: '3px 8px', fontSize: 10, color: 'var(--overlay-0)', borderTop: '1px solid var(--surface-0)', userSelect: 'none' }}>
            ↑↓ navigate · space add · enter open tmdb · esc close
          </div>
        </div>
      )}
    </div>
  );
}
