import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Opens SSE connections to every active competition and triggers a callback
 * whenever any of them push an event (set-logged, set-deleted, competition-ended).
 *
 * @param {string[]} competitionIds – list of active competition IDs
 * @param {(compId: string, event: string, data: object) => void} onEvent
 * @returns {{ liveCount: number }}  – how many streams are currently connected
 */
export function useDashboardStreams(competitionIds, onEvent) {
  const [liveCount, setLiveCount] = useState(0);
  const callbackRef = useRef(onEvent);
  const abortRef = useRef([]);

  useEffect(() => { callbackRef.current = onEvent; }, [onEvent]);

  // Stable serialisation so useEffect only re-fires when the set of IDs changes
  const idsKey = competitionIds.slice().sort().join(',');

  useEffect(() => {
    // Tear down previous connections
    abortRef.current.forEach((a) => a.abort());
    abortRef.current = [];
    setLiveCount(0);

    if (!competitionIds || competitionIds.length === 0) return;

    const token = localStorage.getItem('ff_token');
    let connected = 0;

    competitionIds.forEach((compId) => {
      const controller = new AbortController();
      abortRef.current.push(controller);

      (async () => {
        try {
          const res = await fetch(`/api/competitions/${compId}/stream`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });

          if (!res.ok) return;

          connected++;
          setLiveCount(connected);

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
                  callbackRef.current(compId, currentEvent, data);
                } catch { /* non-JSON, ignore */ }
                currentEvent = 'message';
              }
            }
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Dashboard SSE error:', err);
          }
        } finally {
          connected = Math.max(0, connected - 1);
          setLiveCount(connected);
        }
      })();
    });

    return () => {
      abortRef.current.forEach((a) => a.abort());
      abortRef.current = [];
      setLiveCount(0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return { liveCount };
}
