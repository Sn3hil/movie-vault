import { useEffect, useMemo } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { getUsername } from '../hooks/useUser';
import { useSSE } from '../hooks/useSSE';
import { useRoomMovies } from '../hooks/useMovies';
import { MovieList } from './MovieList';
import { AddMovieForm } from './AddMovieForm';
import { RoomChat } from './RoomChat';

type SubTabType = 'watched' | 'watchlist' | 'rewatch' | 'chat';

const VALID_VIEWS: SubTabType[] = ['watched', 'watchlist', 'rewatch', 'chat'];

export function RoomView() {
  const username = getUsername()!;
  const { view } = useParams<{ view: string }>();
  const navigate = useNavigate();

  const activeSubTab = view as SubTabType;

  useEffect(() => {
    if (!VALID_VIEWS.includes(activeSubTab)) {
      navigate('/room/watchlist', { replace: true });
    }
  }, [activeSubTab, navigate]);

  const lastUpdate = useSSE();
  const { room, roomActions } = useRoomMovies(lastUpdate);

  const watched = room.data?.watched ?? [];
  const watchlist = room.data?.watchlist ?? [];
  const rewatch = room.data?.rewatch ?? [];

  const watchedIds = useMemo(() => new Set<string>(watched.map((m: any) => `${m.type}-${m.tmdbId}`)), [watched]);
  const watchlistIds = useMemo(() => new Set<string>(watchlist.map((m: any) => `${m.type}-${m.tmdbId}`)), [watchlist]);
  const rewatchIds = useMemo(() => new Set<string>(rewatch.map((m: any) => `${m.type}-${m.tmdbId}`)), [rewatch]);

  if (room.loading && !room.data) {
    return <div style={{ padding: 20, textAlign: 'center' }}><span className="loading-spinner" /> loading room...</div>;
  }

  if (room.error && !room.data) {
    return <div className="error-banner">{'>'} Error: {room.error} <button className="btn retry-btn" onClick={room.refetch}>Retry</button></div>;
  }

  return (
    <div className={`content-area${room.loading ? ' reloading' : ''}`}>
      <div className="sub-tab-bar">
        <NavLink
          to="/room/watched"
          className={({ isActive }) => `sub-tab-item${isActive ? ' active' : ''}`}
        >
          {'>'} Room Watched ({watched.length})
        </NavLink>
        <NavLink
          to="/room/watchlist"
          className={({ isActive }) => `sub-tab-item${isActive ? ' active' : ''}`}
        >
          {'>'} Room Watchlist ({watchlist.length})
        </NavLink>
        <NavLink
          to="/room/rewatch"
          className={({ isActive }) => `sub-tab-item${isActive ? ' active' : ''}`}
        >
          {'>'} Room Rewatch ({rewatch.length})
        </NavLink>
        <NavLink
          to="/room/chat"
          className={({ isActive }) => `sub-tab-item${isActive ? ' active' : ''}`}
        >
          {'>'} Chat
        </NavLink>
      </div>

      {activeSubTab === 'watched' && (
        <div className="tab-pane">
          <AddMovieForm
            placeholder="Search for a title to add to Room Watched..."
            onAdd={(result) => roomActions.addWatched(result, username)}
            existingIds={watchedIds}
          />
          <MovieList
            watched={watched}
            watchlist={[]}
            rewatch={rewatch}
            type="watched"
            onDeleteWatched={roomActions.removeWatched}
            onRate={(id, rating) => roomActions.updateRating(id, rating, username)}
            onMoveToRewatch={(id) => roomActions.moveToRewatch(id, username)}
            emptyMessage="Room is empty. Be the first to contribute!"
            isRoom
            scope="room"
            currentUsername={username}
          />
        </div>
      )}

      {activeSubTab === 'watchlist' && (
        <div className="tab-pane">
          <AddMovieForm
            placeholder="Search for a title to add to Room Watchlist..."
            onAdd={(result) => roomActions.addWatchlist(result, username)}
            existingIds={watchlistIds}
          />
          <MovieList
            watched={[]}
            watchlist={watchlist}
            rewatch={[]}
            type="watchlist"
            onDeleteWatchlist={roomActions.removeWatchlist}
            onMoveToWatched={(id, rating) => roomActions.moveToWatched(id, rating, username)}
            emptyMessage="Room watchlist is empty."
            isRoom
            scope="room"
            currentUsername={username}
          />
        </div>
      )}

      {activeSubTab === 'rewatch' && (
        <div className="tab-pane">
          <AddMovieForm
            placeholder="Search for a title to add to Room Rewatch List..."
            onAdd={(result) => roomActions.addRewatch(result, username)}
            existingIds={rewatchIds}
          />
          <MovieList
            watched={watched}
            watchlist={[]}
            rewatch={rewatch}
            type="rewatch"
            onDeleteRewatch={roomActions.removeRewatch}
            onMoveToWatched={(id, rating) => roomActions.rewatchToWatched(id, rating, username)}
            emptyMessage="Room rewatch list is empty."
            isRoom
            scope="room"
            currentUsername={username}
          />
        </div>
      )}

      {activeSubTab === 'chat' && (
        <RoomChat username={username} />
      )}
    </div>
  );
}
