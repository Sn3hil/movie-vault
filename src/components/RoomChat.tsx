import { useState, useEffect, useRef } from 'react';
import { getToken } from '../api';

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 200;

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  sentAt: string;
}

interface RoomChatProps {
  username: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function RoomChat({ username }: RoomChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/room/chat', { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setMessages((data as { messages: ChatMessage[] }).messages);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });

    const es = new EventSource('/api/room/events');

    es.addEventListener('chat-message', (e: MessageEvent) => {
      const msg: ChatMessage = JSON.parse(e.data);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
      });
    });

    es.addEventListener('chat-clear', () => {
      refetchMessages();
    });

    return () => {
      cancelled = true;
      es.close();
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function refetchMessages() {
    try {
      const res = await fetch('/api/room/chat', { headers: authHeaders() });
      const data = await res.json();
      setMessages((data as { messages: ChatMessage[] }).messages);
    } catch {}
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/room/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ username, message: trimmed }),
      });
      const data = await res.json();
      if (data.cleared) {
        await refetchMessages();
      } else if (data.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          const next = [...prev, data as ChatMessage];
          return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
        });
      }
      setInputText('');
    } catch {
      // message lost to the void
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="tab-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {loading ? (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <span className="loading-spinner" /> loading chat...
        </div>
      ) : messages.length === 0 ? (
        <div className="empty-state" style={{ flex: 1 }}>
          <span className="line">no messages yet. say something!</span>
        </div>
      ) : (
        <div ref={listRef} className="chat-message-list">
          {messages.map((msg) => (
            <div key={msg.id} className="chat-message">
              <span className="chat-time">{formatTime(msg.sentAt)}</span>
              <span
                className={`chat-user ${msg.username === username ? 'chat-user--self' : 'chat-user--other'}`}
              >
                &lt;{msg.username}&gt;
              </span>
              <span className="chat-text">{msg.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="chat-input-area">
        <span className="chat-prompt">[{username}@room]$</span>
        <form onSubmit={handleSend} className="chat-input-form">
          <input
            className="chat-input"
            type="text"
            placeholder="type a message..."
            value={inputText}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setInputText(e.target.value)}
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}
