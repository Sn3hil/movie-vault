import { useMemo } from 'react';
import { useFetch } from '../hooks/useMovies';
import { MovieList } from './MovieList';
import { AddMovieForm } from './AddMovieForm';
import type { MovieSearchResult, WatchlistEntry, RoomWatchlistEntry } from '../types';

interface PersonalViewProps {
  username: string;
}

export function PersonalView({ username }: PersonalViewProps) {
  const { user, userActions } = useFetchBased(username);
  const room = useFetch<any>('/api/room');

  const watched = user.data?.watched ?? [];
  const watchlist = user.data?.watchlist ?? [];

  const watchedIds = useMemo(() => new Set<string>(watched.map((m: any) => `${m.type}-${m.tmdbId}`)), [watched]);
  const watchlistIds = useMemo(() => new Set<string>(watchlist.map((m: any) => `${m.type}-${m.tmdbId}`)), [watchlist]);

  const roomWatchlistIds = new Set<string>();
  if (room.data?.watchlist) {
    for (const entry of room.data.watchlist) {
      roomWatchlistIds.add(`${entry.type}-${entry.tmdbId}`);
    }
  }

  if (user.loading && !user.data) {
    return <div style={{ padding: 20, textAlign: 'center' }}><span className="loading-spinner" /> loading...</div>;
  }

  if (user.error && !user.data) {
    return <div className="error-banner">{'>'} Error: {user.error} <button className="btn retry-btn" onClick={user.refetch}>Retry</button></div>;
  }

  return (
    <div className={`content-area${user.loading ? ' reloading' : ''}`}>
      <div>
        <div className="section-header">
          <span className="section-title">{'>'} Watched</span>
          <span className="section-count">{watched.length} titles</span>
        </div>
        <AddMovieForm placeholder="Search for a title to add..." onAdd={(result) => userActions.addWatched(result)} existingIds={watchedIds} />
        <MovieList
          watched={watched}
          watchlist={[]}
          type="watched"
          onDeleteWatched={userActions.removeWatched}
          onRate={userActions.updateRating}
          onDeleteWatchlist={() => {}}
          onMoveToWatched={() => {}}
          scope="user"
        />
      </div>
      <div style={{ marginTop: 20 }}>
        <div className="section-header">
          <span className="section-title">{'>'} Watchlist</span>
          <span className="section-count">{watchlist.length} titles</span>
        </div>
        <AddMovieForm placeholder="Search for a title to add..." onAdd={(result) => userActions.addWatchlist(result)} existingIds={watchlistIds} />
        <MovieList
          watched={[]}
          watchlist={watchlist}
          type="watchlist"
          onDeleteWatched={() => {}}
          onRate={() => {}}
          onDeleteWatchlist={userActions.removeWatchlist}
          onMoveToWatched={(id, rating) => userActions.moveToWatched(id, rating)}
          onAddToRoom={(entry: WatchlistEntry | RoomWatchlistEntry) => {
            fetch('/api/room/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tmdbId: entry.tmdbId,
                type: entry.type,
                name: entry.name,
                poster: entry.poster,
                username,
                criticRating: (entry as WatchlistEntry).criticRating,
                tmdbUrl: entry.tmdbUrl,
                year: entry.year,
              }),
            }).then(() => room.refetch());
          }}
          roomWatchlistIds={roomWatchlistIds}
          scope="user"
        />
      </div>
    </div>
  );
}

function useFetchBased(username: string | null) {
  const user = useFetch<any>(`/api/user/${username}/data`, [username]);

  function mediaPayload(result: MovieSearchResult) {
    return {
      tmdbId: result.id,
      type: result.media_type,
      name: result.title,
      poster: result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : undefined,
      tmdbUrl: `https://www.themoviedb.org/${result.media_type}/${result.id}`,
      year: result.release_date?.slice(0, 4) || undefined,
      criticRating: result.vote_average || undefined,
    };
  }

  const userActions = {
    async addWatched(result: MovieSearchResult) {
      await fetch(`/api/user/${username}/watched`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaPayload(result)),
      });
      user.refetch();
    },
    async updateRating(id: string, rating: number) {
      await fetch(`/api/user/${username}/watched/${id}/rating`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating }),
      });
      user.refetch();
    },
    async removeWatched(id: string) {
      await fetch(`/api/user/${username}/watched/${id}`, { method: 'DELETE' });
      user.refetch();
    },
    async addWatchlist(result: MovieSearchResult) {
      await fetch(`/api/user/${username}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaPayload(result)),
      });
      user.refetch();
    },
    async removeWatchlist(id: string) {
      await fetch(`/api/user/${username}/watchlist/${id}`, { method: 'DELETE' });
      user.refetch();
    },
    async moveToWatched(id: string, rating: number) {
      await fetch(`/api/user/${username}/watchlist/${id}/move`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating }),
      });
      user.refetch();
    },
  };
  return { user, userActions };
}
