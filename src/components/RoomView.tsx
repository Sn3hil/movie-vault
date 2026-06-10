import { useMemo } from 'react';
import { useSSE } from '../hooks/useSSE';
import { useRoomMovies } from '../hooks/useMovies';
import { MovieList } from './MovieList';
import { AddMovieForm } from './AddMovieForm';

interface RoomViewProps {
  username: string;
}

export function RoomView({ username }: RoomViewProps) {
  const lastUpdate = useSSE();
  const { room, roomActions } = useRoomMovies(lastUpdate);

  const watched = room.data?.watched ?? [];
  const watchlist = room.data?.watchlist ?? [];

  const watchedIds = useMemo(() => new Set<string>(watched.map((m: any) => `${m.type}-${m.tmdbId}`)), [watched]);
  const watchlistIds = useMemo(() => new Set<string>(watchlist.map((m: any) => `${m.type}-${m.tmdbId}`)), [watchlist]);

  if (room.loading && !room.data) {
    return <div style={{ padding: 20, textAlign: 'center' }}><span className="loading-spinner" /> loading room...</div>;
  }

  if (room.error && !room.data) {
    return <div className="error-banner">{'>'} Error: {room.error} <button className="btn retry-btn" onClick={room.refetch}>Retry</button></div>;
  }

  return (
    <div className={`content-area${room.loading ? ' reloading' : ''}`}>
      <div>
        <div className="section-header">
          <span className="section-title">{'>'} Room Watched</span>
          <span className="section-count">{watched.length} titles</span>
        </div>
        <AddMovieForm placeholder="Search for a title to add..." onAdd={(result) => roomActions.addWatched(result, username)} existingIds={watchedIds} />
        <MovieList
          watched={watched}
          watchlist={[]}
          type="watched"
          onDeleteWatched={roomActions.removeWatched}
          onRate={(id, rating) => roomActions.updateRating(id, rating, username)}
          onDeleteWatchlist={() => {}}
          onMoveToWatched={() => {}}
          emptyMessage="Room is empty. Be the first to contribute!"
          isRoom
          scope="room"
          currentUsername={username}
        />
      </div>
      <div style={{ marginTop: 20 }}>
        <div className="section-header">
          <span className="section-title">{'>'} Room Watchlist</span>
          <span className="section-count">{watchlist.length} titles</span>
        </div>
        <AddMovieForm placeholder="Search for a title to add..." onAdd={(result) => roomActions.addWatchlist(result, username)} existingIds={watchlistIds} />
        <MovieList
          watched={[]}
          watchlist={watchlist}
          type="watchlist"
          onDeleteWatched={() => {}}
          onRate={() => {}}
          onDeleteWatchlist={roomActions.removeWatchlist}
          onMoveToWatched={(id, rating) => roomActions.moveToWatched(id, rating, username)}
          emptyMessage="Room watchlist is empty."
          isRoom
          scope="room"
          currentUsername={username}
        />
      </div>
    </div>
  );
}
