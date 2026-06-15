import { db } from '../db';

type MediaType = 'movie' | 'tv';

function validateUsername(username: string): string | null {
  if (!username || username.length < 3 || username.length > 20) {
    return 'username must be 3-20 alphanumeric characters';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'username must be alphanumeric';
  }
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

export async function handleUserRoute(req: Request, url: URL): Promise<Response> {
  const parts = url.pathname.split('/').filter(Boolean);

  // GET /api/user/:username/data
  if (parts.length === 4 && parts[3] === 'data' && req.method === 'GET') {
    const username = parts[2];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    const watched = db.query(`
      SELECT uw.id, m.name, uw.rating, uw.added_at AS addedAt,
             m.poster, m.critic_rating AS criticRating, m.tmdb_url AS tmdbUrl, m.year, m.tmdb_id AS tmdbId, m.type
      FROM user_watched uw
      JOIN media m ON m.tmdb_id = uw.tmdb_id AND m.type = uw.type
      WHERE uw.username = ?
      ORDER BY uw.added_at DESC
    `).all(username);

    const watchlist = db.query(`
      SELECT uwl.id, m.name, uwl.added_at AS addedAt,
             m.poster, m.critic_rating AS criticRating, m.tmdb_url AS tmdbUrl, m.year,
             m.tmdb_id AS tmdbId, m.type
      FROM user_watchlist uwl
      JOIN media m ON m.tmdb_id = uwl.tmdb_id AND m.type = uwl.type
      WHERE uwl.username = ?
      ORDER BY uwl.added_at DESC
    `).all(username);

    const rewatch = db.query(`
      SELECT ur.id, m.name, ur.added_at AS addedAt,
             m.poster, m.critic_rating AS criticRating, m.tmdb_url AS tmdbUrl, m.year,
             m.tmdb_id AS tmdbId, m.type
      FROM user_rewatch ur
      JOIN media m ON m.tmdb_id = ur.tmdb_id AND m.type = ur.type
      WHERE ur.username = ?
      ORDER BY ur.added_at DESC
    `).all(username);

    return Response.json({ watched, watchlist, rewatch });
  }

  // POST /api/user/:username/watched
  if (parts.length === 4 && parts[3] === 'watched' && req.method === 'POST') {
    const username = parts[2];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    const body = await parseBody(req);
    const { tmdbId, type, name, poster, tmdbUrl, year } = body as Record<string, unknown>;

    if (typeof tmdbId !== 'number') return Response.json({ error: 'tmdbId must be a number' }, { status: 400 });
    if (!isMediaType(type)) return Response.json({ error: 'type must be "movie" or "tv"' }, { status: 400 });
    if (!name || typeof name !== 'string' || !name.trim()) return Response.json({ error: 'name is required' }, { status: 400 });

    const rating = typeof body.rating === 'number' ? Math.max(0, Math.min(5, Math.round(body.rating))) : 0;
    const id = generateId();
    const addedAt = new Date().toISOString();

    db.run(
      `INSERT OR IGNORE INTO media (tmdb_id, type, name, poster, tmdb_url, year, critic_rating) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tmdbId, type, name.trim(), (poster as string | null) ?? null, (tmdbUrl as string | null) ?? null, (year as string | null) ?? null, (body.criticRating as number | null) ?? null],
    );
    db.run(
      `INSERT INTO user_watched (id, username, tmdb_id, type, rating, added_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, username, tmdbId, type, rating, addedAt],
    );

    return Response.json({ id, name: name.trim(), rating, addedAt, poster, criticRating: body.criticRating, tmdbUrl, year, tmdbId, type }, { status: 201 });
  }

  // PUT /api/user/:username/watched/:id/rating
  if (parts.length === 6 && parts[3] === 'watched' && parts[5] === 'rating' && req.method === 'PUT') {
    const username = parts[2];
    const id = parts[4];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    const body = await parseBody(req);
    const rating = typeof body.rating === 'number' ? Math.max(0, Math.min(5, Math.round(body.rating))) : -1;
    if (rating < 0 || rating > 5) return Response.json({ error: 'rating must be 0-5' }, { status: 400 });

    const result = db.run(
      `UPDATE user_watched SET rating = ? WHERE id = ? AND username = ?`,
      [rating, id, username],
    );
    if (result.changes === 0) return Response.json({ error: 'not found' }, { status: 404 });

    const entry = db.query(`
      SELECT uw.id, m.name, uw.rating, uw.added_at AS addedAt,
             m.poster, m.critic_rating AS criticRating, m.tmdb_url AS tmdbUrl, m.year, m.tmdb_id AS tmdbId, m.type
      FROM user_watched uw
      JOIN media m ON m.tmdb_id = uw.tmdb_id AND m.type = uw.type
      WHERE uw.id = ?
    `).get(id);

    return Response.json(entry);
  }

  // DELETE /api/user/:username/watched/:id
  if (parts.length === 5 && parts[3] === 'watched' && req.method === 'DELETE') {
    const username = parts[2];
    const id = parts[4];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    db.run(`DELETE FROM user_watched WHERE id = ? AND username = ?`, [id, username]);
    return Response.json({ success: true });
  }

  // POST /api/user/:username/watchlist
  if (parts.length === 4 && parts[3] === 'watchlist' && req.method === 'POST') {
    const username = parts[2];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    const body = await parseBody(req);
    const { tmdbId, type, name, poster, tmdbUrl, year, criticRating } = body as Record<string, unknown>;

    if (typeof tmdbId !== 'number') return Response.json({ error: 'tmdbId must be a number' }, { status: 400 });
    if (!isMediaType(type)) return Response.json({ error: 'type must be "movie" or "tv"' }, { status: 400 });
    if (!name || typeof name !== 'string' || !name.trim()) return Response.json({ error: 'name is required' }, { status: 400 });

    const id = generateId();
    const addedAt = new Date().toISOString();
    const parsedCriticRating = typeof criticRating === 'number' ? criticRating : null;

    db.run(
      `INSERT OR IGNORE INTO media (tmdb_id, type, name, poster, tmdb_url, year, critic_rating) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tmdbId, type, name.trim(), (poster as string | null) ?? null, (tmdbUrl as string | null) ?? null, (year as string | null) ?? null, parsedCriticRating],
    );
    db.run(
      `INSERT INTO user_watchlist (id, username, tmdb_id, type, added_at) VALUES (?, ?, ?, ?, ?)`,
      [id, username, tmdbId, type, addedAt],
    );

    return Response.json(
      { id, name: name.trim(), addedAt, poster, criticRating: parsedCriticRating, tmdbUrl, year, tmdbId, type },
      { status: 201 },
    );
  }

  // DELETE /api/user/:username/watchlist/:id
  if (parts.length === 5 && parts[3] === 'watchlist' && req.method === 'DELETE') {
    const username = parts[2];
    const id = parts[4];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    db.run(`DELETE FROM user_watchlist WHERE id = ? AND username = ?`, [id, username]);
    return Response.json({ success: true });
  }

  // POST /api/user/:username/watchlist/:id/move
  if (parts.length === 6 && parts[3] === 'watchlist' && parts[5] === 'move' && req.method === 'POST') {
    const username = parts[2];
    const id = parts[4];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    const body = await parseBody(req);
    const rating = typeof body.rating === 'number' ? Math.max(1, Math.min(5, Math.round(body.rating))) : -1;
    if (rating < 1 || rating > 5) return Response.json({ error: 'rating must be 1-5' }, { status: 400 });

    const existing = db.query(
      `SELECT tmdb_id, type FROM user_watchlist WHERE id = ? AND username = ?`,
    ).get(id, username) as { tmdb_id: number; type: string } | null;

    if (!existing) return Response.json({ error: 'not found' }, { status: 404 });

    const newId = generateId();
    const addedAt = new Date().toISOString();

    db.transaction(() => {
      db.run(`DELETE FROM user_watchlist WHERE id = ? AND username = ?`, [id, username]);
      db.run(
        `INSERT INTO user_watched (id, username, tmdb_id, type, rating, added_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, username, existing.tmdb_id, existing.type, rating, addedAt],
      );
    })();

    const entry = db.query(`
      SELECT uw.id, m.name, uw.rating, uw.added_at AS addedAt,
             m.poster, m.critic_rating AS criticRating, m.tmdb_url AS tmdbUrl, m.year, m.tmdb_id AS tmdbId, m.type
      FROM user_watched uw
      JOIN media m ON m.tmdb_id = uw.tmdb_id AND m.type = uw.type
      WHERE uw.id = ?
    `).get(newId);

    return Response.json(entry, { status: 201 });
  }

  // POST /api/user/:username/rewatch
  if (parts.length === 4 && parts[3] === 'rewatch' && req.method === 'POST') {
    const username = parts[2];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    const body = await parseBody(req);
    const { tmdbId, type, name, poster, tmdbUrl, year, criticRating } = body as Record<string, unknown>;

    if (typeof tmdbId !== 'number') return Response.json({ error: 'tmdbId must be a number' }, { status: 400 });
    if (!isMediaType(type)) return Response.json({ error: 'type must be "movie" or "tv"' }, { status: 400 });
    if (!name || typeof name !== 'string' || !name.trim()) return Response.json({ error: 'name is required' }, { status: 400 });

    const id = generateId();
    const addedAt = new Date().toISOString();
    const parsedCriticRating = typeof criticRating === 'number' ? criticRating : null;

    db.run(
      `INSERT OR IGNORE INTO media (tmdb_id, type, name, poster, tmdb_url, year, critic_rating) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tmdbId, type, name.trim(), (poster as string | null) ?? null, (tmdbUrl as string | null) ?? null, (year as string | null) ?? null, parsedCriticRating],
    );
    db.run(
      `INSERT INTO user_rewatch (id, username, tmdb_id, type, added_at) VALUES (?, ?, ?, ?, ?)`,
      [id, username, tmdbId, type, addedAt],
    );

    return Response.json(
      { id, name: name.trim(), addedAt, poster, criticRating: parsedCriticRating, tmdbUrl, year, tmdbId, type },
      { status: 201 },
    );
  }

  // DELETE /api/user/:username/rewatch/:id
  if (parts.length === 5 && parts[3] === 'rewatch' && req.method === 'DELETE') {
    const username = parts[2];
    const id = parts[4];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    db.run(`DELETE FROM user_rewatch WHERE id = ? AND username = ?`, [id, username]);
    return Response.json({ success: true });
  }

  // POST /api/user/:username/watched/:id/move-to-rewatch
  if (parts.length === 6 && parts[3] === 'watched' && parts[5] === 'move-to-rewatch' && req.method === 'POST') {
    const username = parts[2];
    const id = parts[4];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    const existing = db.query(
      `SELECT tmdb_id, type FROM user_watched WHERE id = ? AND username = ?`,
    ).get(id, username) as { tmdb_id: number; type: string } | null;

    if (!existing) return Response.json({ error: 'not found' }, { status: 404 });

    const newId = generateId();
    const addedAt = new Date().toISOString();

    db.transaction(() => {
      // Intentionally do NOT delete from user_watched
      db.run(
        `INSERT INTO user_rewatch (id, username, tmdb_id, type, added_at) VALUES (?, ?, ?, ?, ?)`,
        [newId, username, existing.tmdb_id, existing.type, addedAt],
      );
    })();

    return Response.json({ id: newId, tmdbId: existing.tmdb_id, type: existing.type, addedAt }, { status: 201 });
  }

  // POST /api/user/:username/rewatch/:id/move-to-watched
  if (parts.length === 6 && parts[3] === 'rewatch' && parts[5] === 'move-to-watched' && req.method === 'POST') {
    const username = parts[2];
    const id = parts[4];
    const err = validateUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });

    const body = await parseBody(req);
    const rating = typeof body.rating === 'number' ? Math.max(0, Math.min(5, Math.round(body.rating))) : 0;

    const existing = db.query(
      `SELECT tmdb_id, type FROM user_rewatch WHERE id = ? AND username = ?`,
    ).get(id, username) as { tmdb_id: number; type: string } | null;

    if (!existing) return Response.json({ error: 'not found' }, { status: 404 });

    const newId = generateId();
    const addedAt = new Date().toISOString();

    db.transaction(() => {
      db.run(`DELETE FROM user_rewatch WHERE id = ? AND username = ?`, [id, username]);
      db.run(
        `UPDATE user_watched SET rating = ? WHERE tmdb_id = ? AND type = ? AND username = ?`,
        [rating, existing.tmdb_id, existing.type, username],
      );
    })();

    return Response.json({ id: existing.tmdb_id /* Send back something valid */, tmdbId: existing.tmdb_id, type: existing.type, addedAt, rating }, { status: 201 });
  }

  return Response.json({ error: 'not found' }, { status: 404 });
}
