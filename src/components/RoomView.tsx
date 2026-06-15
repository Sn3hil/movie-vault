import { useMemo, useState } from 'react';
import { useSSE } from '../hooks/useSSE';
import { useRoomMovies } from '../hooks/useMovies';
import { MovieList } from './MovieList';
import { AddMovieForm } from './AddMovieForm';

interface RoomViewProps {
  username: string;
}

type SubTabType = 'watched' | 'watchlist' | 'rewatch';

export function RoomView({ username }: RoomViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('watched');
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
        <div 
          className={`sub-tab-item${activeSubTab === 'watched' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('watched')}
        >
          {'>'} Room Watched ({watched.length})
        </div>
        <div 
          className={`sub-tab-item${activeSubTab === 'watchlist' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('watchlist')}
        >
          {'>'} Room Watchlist ({watchlist.length})
        </div>
        <div 
          className={`sub-tab-item${activeSubTab === 'rewatch' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('rewatch')}
        >
          {'>'} Room Rewatch ({rewatch.length})
        </div>
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
    </div>
  );
}
