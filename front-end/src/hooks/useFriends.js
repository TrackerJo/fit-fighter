import { useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';
import { useNotification } from '../context/NotificationContext';

export function useFriends() {
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const notification = useNotification();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [f, inc, out] = await Promise.all([
        api.listFriends(),
        api.incomingFriendRequests(),
        api.outgoingFriendRequests()
      ]);
      setFriends(f.friends || []);
      setIncoming(inc.requests || []);
      setOutgoing(out.requests || []);
    } catch (e) { console.error('Failed to load friends:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh when a friend-related notification arrives via SSE
  useEffect(() => {
    if (!notification?.lastEvent) return;
    const { type } = notification.lastEvent;
    if (type === 'friend-request-received' || type === 'friend-request-accepted') {
      refresh();
    }
  }, [notification?.lastEvent, refresh]);

  const search = useCallback(async (name) => {
    if (!name || name.length < 2) { setSearchResults([]); return; }
    try {
      const data = await api.searchUsers(name);
      setSearchResults(data.users || []);
    } catch { setSearchResults([]); }
  }, []);

  const sendRequest = useCallback(async (recipientId) => {
    await api.sendFriendRequest(recipientId);
    refresh();
  }, [refresh]);

  const accept = useCallback(async (requestId) => {
    await api.acceptFriendRequest(requestId);
    refresh();
  }, [refresh]);

  const decline = useCallback(async (requestId) => {
    await api.declineFriendRequest(requestId);
    refresh();
  }, [refresh]);

  const remove = useCallback(async (friendId) => {
    await api.removeFriend(friendId);
    refresh();
  }, [refresh]);

  return {
    friends, incoming, outgoing, searchResults, loading,
    refresh, search, sendRequest, accept, decline, remove,
    setSearchResults
  };
}
