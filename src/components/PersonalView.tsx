import { useMemo, useState } from 'react';
import { useFetch } from '../hooks/useMovies';
import { useSSE } from '../hooks/useSSE';
import { MovieList } from './MovieList';
import { AddMovieForm } from './AddMovieForm';
import type { MovieSearchResult, WatchlistEntry, RoomWatchlistEntry, RewatchEntry } from '../types';

interface PersonalViewProps {
  username: string;
}

type SubTabType = 'watched' | 'watchlist' | 'rewatch';

export function PersonalView({ username }: PersonalViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>(() => {
    return (localStorage.getItem('vault_personal_tab') as SubTabType) || 'watched';
  });

  const handleTabChange = (tab: SubTabType) => {
    setActiveSubTab(tab);
    localStorage.setItem('vault_personal_tab', tab);
  };
  const lastUpdate = useSSE();
  const { user, userActions } = useFetchBased(username, lastUpdate);
  const room = useFetch<any>('/api/room');

  const watched = user.data?.watched ?? [];
  const watchlist = user.data?.watchlist ?? [];
  const rewatch = user.data?.rewatch ?? [];
  const watchlistOverlaps = user.data?.watchlistOverlaps ?? {};

  const watchedIds = useMemo(() => new Set<string>(watched.map((m: any) => `${m.type}-${m.tmdbId}`)), [watched]);
  const watchlistIds = useMemo(() => new Set<string>(watchlist.map((m: any) => `${m.type}-${m.tmdbId}`)), [watchlist]);
  const rewatchIds = useMemo(() => new Set<string>(rewatch.map((m: any) => `${m.type}-${m.tmdbId}`)), [rewatch]);

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
      <div className="sub-tab-bar">
        <div 
          className={`sub-tab-item${activeSubTab === 'watched' ? ' active' : ''}`}
          onClick={() => handleTabChange('watched')}
        >
          {'>'} Watched ({watched.length})
        </div>
        <div 
          className={`sub-tab-item${activeSubTab === 'watchlist' ? ' active' : ''}`}
          onClick={() => handleTabChange('watchlist')}
        >
          {'>'} Watchlist ({watchlist.length})
        </div>
        <div 
          className={`sub-tab-item${activeSubTab === 'rewatch' ? ' active' : ''}`}
          onClick={() => handleTabChange('rewatch')}
        >
          {'>'} Rewatch ({rewatch.length})
        </div>
      </div>

      {activeSubTab === 'watched' && (
        <div className="tab-pane">
          <AddMovieForm 
            placeholder="Search for a title to add to Watched..." 
            onAdd={(result) => userActions.addWatched(result)} 
            existingIds={watchedIds} 
          />
          <MovieList
            watched={watched}
            watchlist={[]}
            rewatch={rewatch}
            type="watched"
            onDeleteWatched={userActions.removeWatched}
            onRate={userActions.updateRating}
            onMoveToRewatch={userActions.moveToRewatch}
            scope="user"
          />
        </div>
      )}

      {activeSubTab === 'watchlist' && (
        <div className="tab-pane">
          <AddMovieForm 
            placeholder="Search for a title to add to Watchlist..." 
            onAdd={(result) => userActions.addWatchlist(result)} 
            existingIds={watchlistIds} 
          />
          <MovieList
            watched={[]}
            watchlist={watchlist}
            rewatch={[]}
            type="watchlist"
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
            watchlistOverlaps={watchlistOverlaps}
            scope="user"
          />
        </div>
      )}

      {activeSubTab === 'rewatch' && (
        <div className="tab-pane">
          <AddMovieForm 
            placeholder="Search for a title to add to Rewatch List..." 
            onAdd={(result) => userActions.addRewatch(result)} 
            existingIds={rewatchIds} 
          />
          <MovieList
            watched={watched}
            watchlist={[]}
            rewatch={rewatch}
            type="rewatch"
            onDeleteRewatch={userActions.removeRewatch}
            onMoveToWatched={(id, rating) => userActions.rewatchToWatched(id, rating)}
            scope="user"
          />
        </div>
      )}
    </div>
  );
}

function useFetchBased(username: string | null, lastUpdate: number) {
  const user = useFetch<any>(`/api/user/${username}/data`, [username, lastUpdate]);

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
    async addRewatch(result: MovieSearchResult) {
      await fetch(`/api/user/${username}/rewatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaPayload(result)),
      });
      user.refetch();
    },
    async removeRewatch(id: string) {
      await fetch(`/api/user/${username}/rewatch/${id}`, { method: 'DELETE' });
      user.refetch();
    },
    async moveToRewatch(id: string) {
      await fetch(`/api/user/${username}/watched/${id}/move-to-rewatch`, {
        method: 'POST',
      });
      user.refetch();
    },
    async rewatchToWatched(id: string, rating: number) {
      await fetch(`/api/user/${username}/rewatch/${id}/move-to-watched`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating }),
      });
      user.refetch();
    },
  };
  return { user, userActions };
}
