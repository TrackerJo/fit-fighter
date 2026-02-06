import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook that opens an SSE connection to a competition's real-time
 * event stream.  Returns connection status and fires the provided callback
 * whenever the server pushes an event.
 *
 * @param {string|null} competitionId  – null disables the stream
 * @param {(event: string, data: object) => void} onEvent – called for each SSE event
 * @returns {{ connected: boolean }}
 */
export function useCompetitionStream(competitionId, onEvent) {
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);
  const callbackRef = useRef(onEvent);

  // Keep callback ref up-to-date without reopening the connection
  useEffect(() => { callbackRef.current = onEvent; }, [onEvent]);

  const connect = useCallback(() => {
    if (!competitionId) return;

    const token = localStorage.getItem('ff_token');
    // EventSource doesn't support custom headers, so we pass the token
    // as a query param.  The backend auth middleware reads Authorization
    // header, so we'll add a small proxy-aware approach: use fetch-based
    // EventSource via the standard API and rely on the Vite proxy.
    // Since native EventSource can't send headers, we'll use a polyfill
    // approach with fetch + ReadableStream.
    const url = `/api/competitions/${competitionId}/stream`;

    const abortController = new AbortController();

    async function startStream() {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });

        if (!res.ok) {
          console.error('SSE stream failed:', res.status);
          setConnected(false);
          return;
        }

        setConnected(true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE frames from the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // keep incomplete line in buffer

          let currentEvent = 'message';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const raw = line.slice(6);
              try {
                const data = JSON.parse(raw);
                callbackRef.current(currentEvent, data);
              } catch {
                // Non-JSON data, ignore
              }
              currentEvent = 'message';
            }
            // Skip comment lines (`:`) and empty lines
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('SSE stream error:', err);
        }
      } finally {
        setConnected(false);
      }
    }

    startStream();

    return () => {
      abortController.abort();
      setConnected(false);
    };
  }, [competitionId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { connected };
}
