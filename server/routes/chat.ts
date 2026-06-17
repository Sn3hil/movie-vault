import { db } from '../db';
import { roomBroadcaster } from '../sse';

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 200;

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

function fetchMessages() {
  const rows = db.query(
    `SELECT id, username, message, sent_at AS sentAt FROM room_chat ORDER BY sent_at DESC LIMIT ?`,
  ).all(MAX_MESSAGES) as { id: string; username: string; message: string; sentAt: string }[];
  return rows.reverse();
}

function pruneMessages() {
  db.run(
    `DELETE FROM room_chat WHERE id NOT IN (SELECT id FROM room_chat ORDER BY sent_at DESC LIMIT ?)`,
    [MAX_MESSAGES],
  );
}

export async function handleChatRoute(req: Request, url: URL): Promise<Response> {
  const parts = url.pathname.split('/').filter(Boolean);

  // GET /api/room/chat
  if (parts.length === 3 && parts[2] === 'chat' && req.method === 'GET') {
    return Response.json({ messages: fetchMessages() });
  }

  // POST /api/room/chat
  if (parts.length === 3 && parts[2] === 'chat' && req.method === 'POST') {
    const body = await parseBody(req);
    const { username, message } = body as Record<string, unknown>;

    if (!username || typeof username !== 'string') {
      return Response.json({ error: 'username is required' }, { status: 400 });
    }
    const userErr = validateUsername(username);
    if (userErr) return Response.json({ error: userErr }, { status: 400 });

    if (!message || typeof message !== 'string' || !message.trim()) {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }
    const trimmed = message.trim();
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ error: `message must be ${MAX_MESSAGE_LENGTH} characters or less` }, { status: 400 });
    }

    const id = generateId();
    const sentAt = new Date().toISOString();

    db.transaction(() => {
      db.run(
        `INSERT INTO room_chat (id, username, message, sent_at) VALUES (?, ?, ?, ?)`,
        [id, username, trimmed, sentAt],
      );
      pruneMessages();
    })();

    const entry = { id, username, message: trimmed, sentAt };
    roomBroadcaster.broadcast('chat-message', JSON.stringify(entry));

    return Response.json(entry, { status: 201 });
  }

  return Response.json({ error: 'not found' }, { status: 404 });
}
