import { signToken, verifyToken } from '../auth';
import { db } from '../db';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validateUsername(username: string): string | null {
  if (!username || username.length < 3 || username.length > 20) {
    return 'username must be 3-20 alphanumeric characters';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'username must be alphanumeric';
  }
  return null;
}

export async function handleLogin(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body as Record<string, unknown>;

  if (typeof username !== 'string') return json({ error: 'username is required' }, 400);
  if (typeof password !== 'string' || !password) return json({ error: 'password is required' }, 400);

  const nameErr = validateUsername(username);
  if (nameErr) return json({ error: nameErr }, 400);

  const existing = db.query(
    `SELECT username, password_hash FROM users WHERE username = ?`,
  ).get(username) as { username: string; password_hash: string | null } | null;

  if (!existing) {
    const passwordHash = await Bun.password.hash(password);
    const createdAt = new Date().toISOString();
    db.run(
      `INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)`,
      [username, passwordHash, createdAt],
    );
    const token = signToken(username);
    return json({ token, username, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  }

  if (existing.password_hash === null) {
    const passwordHash = await Bun.password.hash(password);
    db.run(
      `UPDATE users SET password_hash = ? WHERE username = ?`,
      [passwordHash, username],
    );
    const token = signToken(username);
    return json({ token, username, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  }

  const valid = await Bun.password.verify(password, existing.password_hash);
  if (!valid) {
    return json({ error: 'Invalid credentials' }, 401);
  }

  const token = signToken(username);
  return json({ token, username, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
}

export async function handleRefresh(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'No token provided' }, 401);
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    return json({ error: 'Invalid or expired token' }, 401);
  }

  const token = signToken(payload.username);
  return json({ token, username: payload.username, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
}

export async function handleVerify(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ valid: false }, 200);
  }

  const payload = verifyToken(authHeader.slice(7));
  return json({ valid: payload !== null });
}
