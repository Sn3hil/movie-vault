import { useState, useMemo } from 'react';
import type { WatchedEntry, WatchlistEntry, RoomWatchedEntry, RoomWatchlistEntry, RoomRatings } from '../types';
import { StarRating } from './StarRating';
import { MoveToWatchedModal } from './MoveToWatchedModal';
import { EmptyState } from './EmptyState';

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = target.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!q) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface MovieListProps {
  watched: WatchedEntry[] | RoomWatchedEntry[];
  watchlist: WatchlistEntry[] | RoomWatchlistEntry[];
  type: 'watched' | 'watchlist';
  onDeleteWatched: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onDeleteWatchlist: (id: string) => void;
  onMoveToWatched: (id: string, rating: number) => void;
  onAddToRoom?: (entry: WatchlistEntry | RoomWatchlistEntry) => void;
  roomWatchlistIds?: Set<string>;
  emptyMessage?: string;
  isRoom?: boolean;
  scope: string;
  currentUsername?: string;
}

function RoomUserRatings({ ratings, currentUsername, onRate, entryId }: {
  ratings: RoomRatings;
  currentUsername?: string;
  onRate: (id: string, rating: number) => void;
  entryId: string;
}) {
  const entries = Object.entries(ratings);

  return (
    <span className="meta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {entries.filter(([u]) => u !== currentUsername || !currentUsername).map(([user, rating]) => (
        <span key={user}>
          <span className="username-label">{user}:</span>{' '}
          <span className="star-rating readonly">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={`star${s <= rating ? ' filled' : ''}`} style={{ cursor: 'default' }}>
                {s <= rating ? '\u2605' : '\u2606'}
              </span>
            ))}
          </span>
        </span>
      ))}
      {currentUsername && ratings[currentUsername] !== undefined && (
        <span>
          <span className="username-label">{currentUsername}:</span>{' '}
          <StarRating value={ratings[currentUsername]} onChange={(r) => onRate(entryId, r)} />
        </span>
      )}
      {currentUsername && ratings[currentUsername] === undefined && (
        <span>
          <span className="username-label">{currentUsername}:</span>{' '}
          <StarRating value={0} onChange={(r) => onRate(entryId, r)} />
        </span>
      )}
    </span>
  );
}

export function MovieList({
  watched,
  watchlist,
  type,
  onDeleteWatched,
  onRate,
  onDeleteWatchlist,
  onMoveToWatched,
  onAddToRoom,
  roomWatchlistIds,
  emptyMessage,
  isRoom,
  currentUsername,
}: MovieListProps) {
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveName, setMoveName] = useState('');
  const [search, setSearch] = useState('');

  const filteredWatched = useMemo(
    () => watched.filter((e) => fuzzyMatch(search, e.name)),
    [watched, search],
  );

  const filteredWatchlist = useMemo(
    () => watchlist.filter((e) => fuzzyMatch(search, e.name)),
    [watchlist, search],
  );

  const list = type === 'watched' ? filteredWatched : filteredWatchlist;
  const total = type === 'watched' ? watched.length : watchlist.length;
  const isFiltered = search.trim().length > 0;

  if (total === 0) {
    return <EmptyState message={emptyMessage || (type === 'watched' ? 'No movies watched yet. Start by adding one above.' : 'Your watchlist is empty. Add movies you plan to watch.')} />;
  }

  return (
    <>
      <div className="list-search">
        <input
          className="list-search-input"
          type="text"
          placeholder={`Filter ${type}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="list-search-count">
          {isFiltered ? `${list.length}/${total}` : `${total}`}
        </span>
      </div>
      {list.length === 0 ? (
        <div className="empty-state" style={{ padding: '12px', fontSize: 12 }}>
          <span className="line">no matches for &ldquo;{search}&rdquo;</span>
        </div>
      ) : (
        <div className="movie-list">
          {list.map((entry, i) => (
            <div
              key={entry.id}
              className="movie-item"
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => {
                const url = (entry as any).tmdbUrl;
                if (url) window.open(url, '_blank');
              }}
            >
              <span className="index">#{i + 1}</span>
              {entry.poster && <img src={entry.poster} alt="" className="movie-poster" />}
              <span className="name">
                {entry.name}
                {(entry as any).year ? (
                  <span className="movie-year">{(entry as any).year}</span>
                ) : null}
                {type === 'watchlist' && (entry as WatchlistEntry).criticRating ? (
                  <span className="critic-rating">
                    {(entry as WatchlistEntry).criticRating!.toFixed(1)}
                  </span>
                ) : null}
              </span>
              {type === 'watched' ? (
                <span onClick={(e) => e.stopPropagation()}>
                  {isRoom ? (
                    <RoomUserRatings
                      ratings={(entry as RoomWatchedEntry).ratings}
                      currentUsername={currentUsername}
                      onRate={onRate}
                      entryId={entry.id}
                    />
                  ) : (
                    <StarRating value={(entry as WatchedEntry).rating} onChange={(r) => onRate(entry.id, r)} />
                  )}
                </span>
              ) : null}
              <span className="actions" onClick={(e) => e.stopPropagation()}>
                {type === 'watched' ? (
                  <button className="btn btn-danger" onClick={() => onDeleteWatched(entry.id)}>
                    {'\u2716'}
                  </button>
                ) : (
                  <>
                    {onAddToRoom && (
                      <button
                        className={`btn${roomWatchlistIds?.has(`${entry.type}-${entry.tmdbId}`) ? '' : ' btn-warning'}`}
                        onClick={() => onAddToRoom(entry as WatchlistEntry | RoomWatchlistEntry)}
                        disabled={roomWatchlistIds?.has(`${entry.type}-${entry.tmdbId}`)}
                        style={roomWatchlistIds?.has(`${entry.type}-${entry.tmdbId}`) ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                      >
                        {'\u25B2'} Room
                      </button>
                    )}
                    <button className="btn btn-success" onClick={() => { setMoveId(entry.id); setMoveName(entry.name); }}>
                      {'\u25B6'} Move
                    </button>
                    <button className="btn btn-danger" onClick={() => onDeleteWatchlist(entry.id)}>
                      {'\u2716'}
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {moveId && (
        <MoveToWatchedModal
          movieName={moveName}
          onConfirm={(rating) => {
            onMoveToWatched(moveId, rating);
            setMoveId(null);
          }}
          onCancel={() => setMoveId(null)}
        />
      )}
    </>
  );
}
