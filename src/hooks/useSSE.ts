import { useEffect, useRef, useState } from 'react';

const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

export function useSSE() {
  const [lastUpdate, setLastUpdate] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef(BASE_DELAY);

  function connect() {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource('/api/room/events');
    esRef.current = es;

    es.addEventListener('room-updated', () => {
      setLastUpdate((n) => n + 1);
      delayRef.current = BASE_DELAY;
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      retryRef.current = setTimeout(() => {
        delayRef.current = Math.min(delayRef.current * 2, MAX_DELAY);
        connect();
      }, delayRef.current);
    };

    es.onopen = () => {
      delayRef.current = BASE_DELAY;
    };
  }

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) esRef.current.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, []);

  return lastUpdate;
}
