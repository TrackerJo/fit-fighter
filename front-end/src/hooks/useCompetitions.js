import { useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';

export function useCompetitions() {
  const [active, setActive] = useState([]);
  const [history, setHistory] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, h, inc, out] = await Promise.all([
        api.activeCompetitions(),
        api.competitionHistory(),
        api.incomingCompetitionRequests(),
        api.outgoingCompetitionRequests()
      ]);
      setActive(a.competitions || []);
      setHistory(h.competitions || []);
      setIncomingRequests(inc.requests || []);
      setOutgoingRequests(out.requests || []);
    } catch (e) { console.error('Failed to load competitions:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const sendChallenge = useCallback(async (opponentId) => {
    await api.sendCompetitionRequest(opponentId);
    refresh();
  }, [refresh]);

  const acceptChallenge = useCallback(async (requestId) => {
    await api.acceptCompetitionRequest(requestId);
    refresh();
  }, [refresh]);

  const declineChallenge = useCallback(async (requestId) => {
    await api.declineCompetitionRequest(requestId);
    refresh();
  }, [refresh]);

  const endCompetition = useCallback(async (competitionId) => {
    const result = await api.endCompetition(competitionId);
    refresh();
    return result;
  }, [refresh]);

  const getDetail = useCallback(async (competitionId) => {
    return api.competitionDetail(competitionId);
  }, []);

  return {
    active, history, incomingRequests, outgoingRequests, loading,
    refresh, sendChallenge, acceptChallenge, declineChallenge, endCompetition, getDetail
  };
}
