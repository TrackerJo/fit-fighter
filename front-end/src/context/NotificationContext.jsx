import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AuthContext } from './AuthContext';

const NotificationContext = createContext(null);

/**
 * Provides a user-level SSE connection that pushes real-time events
 * such as friend-request-received, competition-request-received, etc.
 *
 * Any component can subscribe to these events via `useNotification()`.
 */
export function NotificationProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [lastEvent, setLastEvent] = useState(null);
  const abortRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!user) return;

    const token = localStorage.getItem('ff_token');
    if (!token) return;

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const res = await fetch('/api/notifications/stream', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) { setConnected(false); return; }
        setConnected(true);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = 'message';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (currentEvent !== 'connected') {
                  setLastEvent({ type: currentEvent, data, ts: Date.now() });
                }
              } catch { /* non-JSON, ignore */ }
              currentEvent = 'message';
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Notification SSE error:', err);
        }
      } finally {
        setConnected(false);
      }
    })();

    return () => {
      controller.abort();
      setConnected(false);
    };
  }, [user]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return (
    <NotificationContext.Provider value={{ lastEvent, connected }}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Returns `{ lastEvent, connected }`.
 * `lastEvent` is `{ type, data, ts }` or null. Changes on every new SSE event.
 */
export function useNotification() {
  return useContext(NotificationContext);
}
