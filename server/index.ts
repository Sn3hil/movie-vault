import { existsSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { handleUserRoute } from './routes/user';
import { handleRoomRoute } from './routes/room';
import { roomBroadcaster } from './sse';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3069', 10);
const DIST_DIR = join(__dirname, '..', 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(url: URL): Response | null {
  let pathname = url.pathname;
  if (pathname === '/') pathname = '/index.html';

  const filePath = join(DIST_DIR, pathname);

  if (!filePath.startsWith(DIST_DIR)) return null;
  if (!existsSync(filePath)) return null;

  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const content = readFileSync(filePath);
  return new Response(content, {
    headers: { 'Content-Type': mime },
  });
}

async function handleSearch(url: URL): Promise<Response> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'TMDB not configured' }, { status: 501 });
  }

  const query = url.searchParams.get('q');
  if (!query || !query.trim()) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US&page=1`,
    { headers: { Accept: 'application/json' } },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return Response.json(
      { error: `TMDB search failed (${res.status})`, detail },
      { status: 502 },
    );
  }

  const data = await res.json();

  // Normalize results: filter out 'person', unify TV fields to movie-style fields.
  const results = (data.results ?? [])
    .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: any) => ({
      id: r.id,
      media_type: r.media_type as 'movie' | 'tv',
      // TV uses 'name'; movies use 'title'
      title: r.media_type === 'tv' ? (r.name ?? r.original_name ?? '') : (r.title ?? r.original_title ?? ''),
      poster_path: r.poster_path ?? null,
      // TV uses 'first_air_date'; movies use 'release_date'
      release_date: r.media_type === 'tv' ? (r.first_air_date ?? '') : (r.release_date ?? ''),
      vote_average: r.vote_average ?? 0,
    }));

  return Response.json(results);
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    const origin = req.headers.get('origin') || '';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // SSE endpoint
    if (url.pathname === '/api/room/events') {
      const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...corsHeaders,
      };

      const stream = new ReadableStream({
        start(controller) {
          roomBroadcaster.addController(controller);
          controller.enqueue(new TextEncoder().encode(': connected\n\n'));

          const keepalive = setInterval(() => {
            try {
              controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
            } catch {
              clearInterval(keepalive);
            }
          }, 15000);
        },
        cancel() {
          // Controller will be removed on next failed broadcast attempt
        },
      });

      return new Response(stream, { headers });
    }

    // TMDB search proxy
    if (url.pathname === '/api/search' && method === 'GET') {
      const res = await handleSearch(url);
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.headers.set(k, v);
      }
      return res;
    }

    // API routes
    if (url.pathname.startsWith('/api/user/')) {
      const res = await handleUserRoute(req, url);
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.headers.set(k, v);
      }
      return res;
    }

    if (url.pathname.startsWith('/api/room')) {
      const res = await handleRoomRoute(req, url);
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.headers.set(k, v);
      }
      return res;
    }

    // Static files
    const staticRes = serveStatic(url);
    if (staticRes) return staticRes;

    return new Response('not found', { status: 404 });
  },
});

console.log(`movie-vault server running on http://localhost:${PORT}`);
