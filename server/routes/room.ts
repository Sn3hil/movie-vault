import { db } from '../db';
import { roomBroadcaster } from '../sse';

type MediaType = 'movie' | 'tv';

interface RatingRow {
  room_watched_id: string;
  username: string;
  rating: number;
}

function validateUsername(username: string): string | null {
  if (!username || username.length < 3 || username.length > 20) return 'invalid username';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'invalid username';
  return null;
}

function parseBody(req: Request): Promise<Record<string, unknown>> {
  return req.json().catch(() => ({}));
}

function generateId(): string {
  return crypto.randomUUID();
}

function isMediaType(v: unknown): v is MediaType {
  return v === 'movie' || v === 'tv';
}

function fetchRoomWatched() {
  const entries = db.query(`
    SELECT rw.id, m.name, rw.rating, rw.added_at AS addedAt,
           m.poster, rw.added_by AS addedBy, m.critic_rating AS criticRating,
           m.tmdb_url AS tmdbUrl, m.year, m.tmdb_id AS tmdbId, m.type
    FROM room_watched rw
    JOIN media m ON m.tmdb_id = rw.tmdb_id AND m.type = rw.type
    ORDER BY rw.added_at DESC
  `).all() as (Record<string, unknown> & { id: string })[];

  const ratingsRows = db.query(
    `SELECT room_watched_id, username, rating FROM room_ratings`,
  ).all() as RatingRow[];

  // Group ratings by watched_id into { [username]: number }
  const ratingsMap = new Map<string, Record<string, number>>();
  for (const row of ratingsRows) {
    if (!ratingsMap.has(row.room_watched_id)) ratingsMap.set(row.room_watched_id, {});
    ratingsMap.get(row.room_watched_id)![row.username] = row.rating;
  }

  return entries.map((e) => ({ ...e, ratings: ratingsMap.get(e.id) ?? {} }));
}

function fetchRoomWatchlist() {
  return db.query(`
    SELECT rwl.id, m.name, rwl.added_at AS addedAt,
           m.poster, rwl.added_by AS addedBy, m.critic_rating AS criticRating,
           m.tmdb_url AS tmdbUrl, m.year, m.tmdb_id AS tmdbId, m.type
    FROM room_watchlist rwl
    JOIN media m ON m.tmdb_id = rwl.tmdb_id AND m.type = rwl.type
    ORDER BY rwl.added_at DESC
  `).all();
}

function fetchRoomRewatch() {
  return db.query(`
    SELECT rr.id, m.name, rr.added_at AS addedAt,
           m.poster, rr.added_by AS addedBy, m.critic_rating AS criticRating,
           m.tmdb_url AS tmdbUrl, m.year, m.tmdb_id AS tmdbId, m.type
    FROM room_rewatch rr
    JOIN media m ON m.tmdb_id = rr.tmdb_id AND m.type = rr.type
    ORDER BY rr.added_at DESC
  `).all();
}

export async function handleRoomRoute(req: Request, url: URL): Promise<Response> {
  const parts = url.pathname.split('/').filter(Boolean);

  // GET /api/room
  if (parts.length === 2 && req.method === 'GET') {
    return Response.json({ watched: fetchRoomWatched(), watchlist: fetchRoomWatchlist(), rewatch: fetchRoomRewatch() });
  }

  // POST /api/room/watched
  if (parts.length === 3 && parts[2] === 'watched' && req.method === 'POST') {
    const body = await parseBody(req);
    const { tmdbId, type, name, username, poster, tmdbUrl, year } = body as Record<string, unknown>;

    if (typeof tmdbId !== 'number') return Response.json({ error: 'tmdbId must be a number' }, { status: 400 });
    if (!isMediaType(type)) return Response.json({ error: 'type must be "movie" or "tv"' }, { status: 400 });
    if (!name || typeof name !== 'string' || !name.trim()) return Response.json({ error: 'name is required' }, { status: 400 });
    if (!username || typeof username !== 'string' || validateUsername(username)) {
      return Response.json({ error: 'valid username is required' }, { status: 400 });
    }

    const rating = typeof body.rating === 'number' ? Math.max(0, Math.min(5, Math.round(body.rating))) : 0;
    const id = generateId();
    const addedAt = new Date().toISOString();

    db.transaction(() => {
      db.run(
        `INSERT OR IGNORE INTO media (tmdb_id, type, name, poster, tmdb_url, year, critic_rating) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tmdbId, type, name.trim(), (poster as string | null) ?? null, (tmdbUrl as string | null) ?? null, (year as string | null) ?? null, (body.criticRating as number | null) ?? null],
      );
      db.run(
        `INSERT INTO room_watched (id, tmdb_id, type, rating, added_at, added_by) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, tmdbId, type, rating, addedAt, username],
      );
      if (body.rating !== undefined) {
        db.run(
          `INSERT INTO room_ratings (room_watched_id, username, rating) VALUES (?, ?, ?)`,
          [id, username, rating],
        );
      }
    })();

    roomBroadcaster.debouncedNotify('room-updated');
    return Response.json({ success: true });
  }

  // PUT /api/room/watched/:id/rating
  if (parts.length === 5 && parts[2] === 'watched' && parts[4] === 'rating' && req.method === 'PUT') {
    const id = parts[3];
    const body = await parseBody(req);
    const username = body.username;
    const rating = typeof body.rating === 'number' ? Math.max(0, Math.min(5, Math.round(body.rating))) : -1;

    if (rating < 0 || rating > 5) return Response.json({ error: 'rating must be 0-5' }, { status: 400 });
    if (!username || typeof username !== 'string') return Response.json({ error: 'username is required' }, { status: 400 });

    const exists = db.query(`SELECT id FROM room_watched WHERE id = ?`).get(id);
    if (!exists) return Response.json({ error: 'not found' }, { status: 404 });

    db.transaction(() => {
      db.run(
        `INSERT OR REPLACE INTO room_ratings (room_watched_id, username, rating) VALUES (?, ?, ?)`,
        [id, username, rating],
      );
      // Recompute aggregate average from all ratings for this entry
      const rows = db.query(
        `SELECT rating FROM room_ratings WHERE room_watched_id = ?`,
      ).all(id) as { rating: number }[];
      const avg = Math.round(rows.reduce((s, r) => s + r.rating, 0) / rows.length);
      db.run(`UPDATE room_watched SET rating = ? WHERE id = ?`, [avg, id]);
    })();

    const entry = db.query(`
      SELECT rw.id, m.name, rw.rating, rw.added_at AS addedAt,
             m.poster, rw.added_by AS addedBy, m.critic_rating AS criticRating,
             m.tmdb_url AS tmdbUrl, m.year, m.tmdb_id AS tmdbId, m.type
      FROM room_watched rw
      JOIN media m ON m.tmdb_id = rw.tmdb_id AND m.type = rw.type
      WHERE rw.id = ?
    `).get(id) as Record<string, unknown>;

    const ratingRows = db.query(
      `SELECT username, rating FROM room_ratings WHERE room_watched_id = ?`,
    ).all(id) as { username: string; rating: number }[];
    const ratings: Record<string, number> = {};
    for (const r of ratingRows) ratings[r.username] = r.rating;

    roomBroadcaster.debouncedNotify('room-updated');
    return Response.json({ ...entry, ratings });
  }

  // DELETE /api/room/watched/:id
  if (parts.length === 4 && parts[2] === 'watched' && req.method === 'DELETE') {
    const id = parts[3];
    db.run(`DELETE FROM room_watched WHERE id = ?`, [id]); // cascades to room_ratings
    roomBroadcaster.debouncedNotify('room-updated');
    return Response.json({ success: true });
  }

  // POST /api/room/watchlist
  if (parts.length === 3 && parts[2] === 'watchlist' && req.method === 'POST') {
    const body = await parseBody(req);
    const { tmdbId, type, name, username, poster, tmdbUrl, year, criticRating } = body as Record<string, unknown>;

    if (typeof tmdbId !== 'number') return Response.json({ error: 'tmdbId must be a number' }, { status: 400 });
    if (!isMediaType(type)) return Response.json({ error: 'type must be "movie" or "tv"' }, { status: 400 });
    if (!name || typeof name !== 'string' || !name.trim()) return Response.json({ error: 'name is required' }, { status: 400 });
    if (!username || typeof username !== 'string' || validateUsername(username)) {
      return Response.json({ error: 'valid username is required' }, { status: 400 });
    }

    const id = generateId();
    const addedAt = new Date().toISOString();
    const parsedCriticRating = typeof criticRating === 'number' ? criticRating : null;

    db.transaction(() => {
      db.run(
        `INSERT OR IGNORE INTO media (tmdb_id, type, name, poster, tmdb_url, year, critic_rating) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tmdbId, type, name.trim(), (poster as string | null) ?? null, (tmdbUrl as string | null) ?? null, (year as string | null) ?? null, parsedCriticRating],
      );
      db.run(
        `INSERT INTO room_watchlist (id, tmdb_id, type, added_at, added_by) VALUES (?, ?, ?, ?, ?)`,
        [id, tmdbId, type, addedAt, username],
      );
    })();

    roomBroadcaster.debouncedNotify('room-updated');
    return Response.json({ success: true });
  }

  // DELETE /api/room/watchlist/:id
  if (parts.length === 4 && parts[2] === 'watchlist' && req.method === 'DELETE') {
    const id = parts[3];
    db.run(`DELETE FROM room_watchlist WHERE id = ?`, [id]);
    roomBroadcaster.debouncedNotify('room-updated');
    return Response.json({ success: true });
  }

  // POST /api/room/watchlist/:id/move
  if (parts.length === 5 && parts[2] === 'watchlist' && parts[4] === 'move' && req.method === 'POST') {
    const id = parts[3];
    const body = await parseBody(req);
    const username = body.username;
    const rating = typeof body.rating === 'number' ? Math.max(1, Math.min(5, Math.round(body.rating))) : -1;

    if (rating < 1 || rating > 5) return Response.json({ error: 'rating must be 1-5' }, { status: 400 });
    if (!username || typeof username !== 'string' || validateUsername(username)) {
      return Response.json({ error: 'valid username is required' }, { status: 400 });
    }

    const existing = db.query(
      `SELECT tmdb_id, type FROM room_watchlist WHERE id = ?`,
    ).get(id) as { tmdb_id: number; type: string } | null;
    if (!existing) return Response.json({ error: 'not found' }, { status: 404 });

    const newId = generateId();
    const addedAt = new Date().toISOString();

    db.transaction(() => {
      db.run(`DELETE FROM room_watchlist WHERE id = ?`, [id]);
      db.run(
        `INSERT INTO room_watched (id, tmdb_id, type, rating, added_at, added_by) VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, existing.tmdb_id, existing.type, rating, addedAt, username],
      );
      db.run(
        `INSERT INTO room_ratings (room_watched_id, username, rating) VALUES (?, ?, ?)`,
        [newId, username, rating],
      );
    })();

    roomBroadcaster.debouncedNotify('room-updated');
    return Response.json({ success: true }, { status: 201 });
  }

  // POST /api/room/rewatch
  if (parts.length === 3 && parts[2] === 'rewatch' && req.method === 'POST') {
    const body = await parseBody(req);
    const { tmdbId, type, name, username, poster, tmdbUrl, year, criticRating } = body as Record<string, unknown>;

    if (typeof tmdbId !== 'number') return Response.json({ error: 'tmdbId must be a number' }, { status: 400 });
    if (!isMediaType(type)) return Response.json({ error: 'type must be "movie" or "tv"' }, { status: 400 });
    if (!name || typeof name !== 'string' || !name.trim()) return Response.json({ error: 'name is required' }, { status: 400 });
    if (!username || typeof username !== 'string' || validateUsername(username)) {
      return Response.json({ error: 'valid username is required' }, { status: 400 });
    }

    const id = generateId();
    const addedAt = new Date().toISOString();
    const parsedCriticRating = typeof criticRating === 'number' ? criticRating : null;

    db.transaction(() => {
      db.run(
        `INSERT OR IGNORE INTO media (tmdb_id, type, name, poster, tmdb_url, year, critic_rating) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tmdbId, type, name.trim(), (poster as string | null) ?? null, (tmdbUrl as string | null) ?? null, (year as string | null) ?? null, parsedCriticRating],
      );
      db.run(
        `INSERT INTO room_rewatch (id, tmdb_id, type, added_at, added_by) VALUES (?, ?, ?, ?, ?)`,
        [id, tmdbId, type, addedAt, username],
      );
    })();

    roomBroadcaster.debouncedNotify('room-updated');
    return Response.json({ success: true });
  }

  // DELETE /api/room/rewatch/:id
  if (parts.length === 4 && parts[2] === 'rewatch' && req.method === 'DELETE') {
    const id = parts[3];
    db.run(`DELETE FROM room_rewatch WHERE id = ?`, [id]);
    roomBroadcaster.debouncedNotify('room-updated');
    return Response.json({ success: true });
  }

  // POST /api/room/watched/:id/move-to-rewatch
  if (parts.length === 5 && parts[2] === 'watched' && parts[4] === 'move-to-rewatch' && req.method === 'POST') {
    const id = parts[3];
    const body = await parseBody(req);
    const username = body.username;

    if (!username || typeof username !== 'string' || validateUsername(username)) {
      return Response.json({ error: 'valid username is required' }, { status: 400 });
    }

    const existing = db.query(
      `SELECT tmdb_id, type FROM room_watched WHERE id = ?`,
    ).get(id) as { tmdb_id: number; type: string } | null;
    if (!existing) return Response.json({ error: 'not found' }, { status: 404 });

    const newId = generateId();
    const addedAt = new Date().toISOString();

    db.transaction(() => {
      // Don't delete from room_watched either
      db.run(
        `INSERT INTO room_rewatch (id, tmdb_id, type, added_at, added_by) VALUES (?, ?, ?, ?, ?)`,
        [newId, existing.tmdb_id, existing.type, addedAt, username],
      );
    })();

    roomBroadcaster.debouncedNotify('room-updated');
    return Response.json({ success: true }, { status: 201 });
  }

  // POST /api/room/rewatch/:id/move-to-watched
  if (parts.length === 5 && parts[2] === 'rewatch' && parts[4] === 'move-to-watched' && req.method === 'POST') {
    const id = parts[3];
    const body = await parseBody(req);
    const username = body.username;
    const rating = typeof body.rating === 'number' ? Math.max(0, Math.min(5, Math.round(body.rating))) : 0;

    if (!username || typeof username !== 'string' || validateUsername(username)) {
      return Response.json({ error: 'valid username is required' }, { status: 400 });
    }

    const existing = db.query(
      `SELECT tmdb_id, type FROM room_rewatch WHERE id = ?`,
    ).get(id) as { tmdb_id: number; type: string } | null;
    if (!existing) return Response.json({ error: 'not found' }, { status: 404 });

    db.transaction(() => {
      db.run(`DELETE FROM room_rewatch WHERE id = ?`, [id]);
      
      const watched = db.query(
        `SELECT id FROM room_watched WHERE tmdb_id = ? AND type = ?`,
      ).get(existing.tmdb_id, existing.type) as { id: string } | null;
      
      if (watched) {
        db.run(
          `INSERT OR REPLACE INTO room_ratings (room_watched_id, username, rating) VALUES (?, ?, ?)`,
          [watched.id, username, rating],
        );
        // Recompute aggregate
        const rows = db.query(
          `SELECT rating FROM room_ratings WHERE room_watched_id = ?`,
        ).all(watched.id) as { rating: number }[];
        const avg = Math.round(rows.reduce((s, r) => s + r.rating, 0) / rows.length);
        db.run(`UPDATE room_watched SET rating = ? WHERE id = ?`, [avg, watched.id]);
      }
    })();

    roomBroadcaster.debouncedNotify('room-updated');
    return Response.json({ success: true }, { status: 201 });
  }

  return Response.json({ error: 'not found' }, { status: 404 });
}
