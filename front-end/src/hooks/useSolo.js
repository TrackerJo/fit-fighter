import { useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';

export function useSolo() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [active, hist, recs] = await Promise.all([
        api.activeSoloSessions(),
        api.soloHistory(),
        api.soloRecords()
      ]);
      setActiveSessions(active.sessions || []);
      setHistory(hist.sessions || []);
      setRecords(recs);
    } catch (e) {
      console.error('Failed to load solo data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startSession = useCallback(async (name) => {
    const data = await api.createSoloSession(name);
    refresh();
    return data.session;
  }, [refresh]);

  const endSession = useCallback(async (sessionId) => {
    const data = await api.endSoloSession(sessionId);
    refresh();
    return data.session;
  }, [refresh]);

  return {
    activeSessions, history, records, loading,
    refresh, startSession, endSession
  };
}
