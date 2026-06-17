import { useState, useEffect, useRef } from 'react';

const MAX_MESSAGES = 20;
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

export function RoomChat({ username }: RoomChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/room/chat')
      .then((res) => res.json())
      .then((data) => {
        setMessages((data as { messages: ChatMessage[] }).messages);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const es = new EventSource('/api/room/events');

    es.addEventListener('chat-message', (e: MessageEvent) => {
      const msg: ChatMessage = JSON.parse(e.data);
      setMessages((prev) => {
        const next = [...prev, msg];
        return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
      });
    });

    return () => es.close();
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await fetch('/api/room/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, message: trimmed }),
      });
      setInputText('');
    } catch {
      // message lost to the void — the SSE event will pick it up if it went through
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
