import { useState, useEffect, useCallback } from 'react';
import type { MovieSearchResult } from '../types';

interface FetchState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

export function useFetch<T>(url: string, deps: unknown[] = []): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({ loading: true, error: null, data: null });
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetch(url)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d.error || 'request failed'));
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, data });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: String(err), data: null });
      });

    return () => { cancelled = true; };
  }, [url, trigger, ...deps]);

  return { ...state, refetch };
}

async function apiFetch(url: string, options: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `request failed (${res.status})`);
  }
  return res;
}

function resultToMediaPayload(result: MovieSearchResult) {
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

export function useMovies(username: string | null) {
  const userUrl = username ? `/api/user/${username}/data` : null;
  const user = useFetch<any>(userUrl!, [username, userUrl]);

  return {
    user,
    userActions: {
      async addWatched(result: MovieSearchResult) {
        await apiFetch(`/api/user/${username}/watched`, {
          method: 'POST',
          body: JSON.stringify(resultToMediaPayload(result)),
        });
        user.refetch();
      },
      async updateRating(id: string, rating: number) {
        await apiFetch(`/api/user/${username}/watched/${id}/rating`, {
          method: 'PUT',
          body: JSON.stringify({ rating }),
        });
        user.refetch();
      },
      async removeWatched(id: string) {
        await apiFetch(`/api/user/${username}/watched/${id}`, { method: 'DELETE' });
        user.refetch();
      },
      async addWatchlist(result: MovieSearchResult) {
        await apiFetch(`/api/user/${username}/watchlist`, {
          method: 'POST',
          body: JSON.stringify(resultToMediaPayload(result)),
        });
        user.refetch();
      },
      async removeWatchlist(id: string) {
        await apiFetch(`/api/user/${username}/watchlist/${id}`, { method: 'DELETE' });
        user.refetch();
      },
      async moveToWatched(id: string, rating: number) {
        await apiFetch(`/api/user/${username}/watchlist/${id}/move`, {
          method: 'POST',
          body: JSON.stringify({ rating }),
        });
        user.refetch();
      },
    },
  };
}

export function useRoomMovies(lastUpdate: number) {
  const room = useFetch<any>('/api/room', [lastUpdate]);

  return {
    room,
    roomActions: {
      async addWatched(result: MovieSearchResult, username: string) {
        await apiFetch('/api/room/watched', {
          method: 'POST',
          body: JSON.stringify({ ...resultToMediaPayload(result), username }),
        });
        room.refetch();
      },
      async updateRating(id: string, rating: number, username: string) {
        await apiFetch(`/api/room/watched/${id}/rating`, {
          method: 'PUT',
          body: JSON.stringify({ rating, username }),
        });
        room.refetch();
      },
      async removeWatched(id: string) {
        await apiFetch(`/api/room/watched/${id}`, { method: 'DELETE' });
        room.refetch();
      },
      async addWatchlist(result: MovieSearchResult, username: string) {
        await apiFetch('/api/room/watchlist', {
          method: 'POST',
          body: JSON.stringify({ ...resultToMediaPayload(result), username }),
        });
        room.refetch();
      },
      async removeWatchlist(id: string) {
        await apiFetch(`/api/room/watchlist/${id}`, { method: 'DELETE' });
        room.refetch();
      },
      async moveToWatched(id: string, rating: number, username: string) {
        await apiFetch(`/api/room/watchlist/${id}/move`, {
          method: 'POST',
          body: JSON.stringify({ rating, username }),
        });
        room.refetch();
      },
      async addRewatch(result: MovieSearchResult, username: string) {
        await apiFetch('/api/room/rewatch', {
          method: 'POST',
          body: JSON.stringify({ ...resultToMediaPayload(result), username }),
        });
        room.refetch();
      },
      async removeRewatch(id: string) {
        await apiFetch(`/api/room/rewatch/${id}`, { method: 'DELETE' });
        room.refetch();
      },
      async moveToRewatch(id: string, username: string) {
        await apiFetch(`/api/room/watched/${id}/move-to-rewatch`, {
          method: 'POST',
          body: JSON.stringify({ username }),
        });
        room.refetch();
      },
      async rewatchToWatched(id: string, rating: number, username: string) {
        await apiFetch(`/api/room/rewatch/${id}/move-to-watched`, {
          method: 'POST',
          body: JSON.stringify({ rating, username }),
        });
        room.refetch();
      },
    },
  };
}
