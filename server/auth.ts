import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const generated = crypto.randomUUID();
  console.log(`[auth] No JWT_SECRET in env, generated: ${generated}`);
  return generated;
})();

const TOKEN_EXPIRY = '7d';

export function signToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { username: string };
  } catch {
    return null;
  }
}

const PUBLIC_PREFIXES = ['/api/auth/', '/api/room/events'];

export function authMiddleware(req: Request): Response | null {
  const url = new URL(req.url);
  const reqPath = url.pathname;

  for (const prefix of PUBLIC_PREFIXES) {
    if (reqPath.startsWith(prefix)) return null;
  }

  if (!reqPath.startsWith('/api/')) return null;

  const token = url.searchParams.get('token') || extractBearerToken(req);

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
