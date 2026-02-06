import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useFriends } from '../hooks/useFriends';
import { useCompetitions } from '../hooks/useCompetitions';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AnimatedContent from './reactbits/AnimatedContent';
import ShinyText from './reactbits/ShinyText';
import { FiX, FiSearch, FiUserPlus, FiUserCheck, FiUserX } from 'react-icons/fi';
import { FiZap } from 'react-icons/fi';

export default function FriendsPanel({ open, onClose }) {
  const { user } = useContext(AuthContext);
  const {
    friends, incoming, outgoing, searchResults, loading,
    search, sendRequest, accept, decline, remove, setSearchResults
  } = useFriends();
  const { sendChallenge } = useCompetitions();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('friends');
  const [challengingId, setChallengingId] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open) { setQuery(''); setSearchResults([]); setTab('friends'); }
  }, [open, setSearchResults]);

  const handleSearch = useCallback((value) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }, [search]);

  const requestCount = incoming.length;

  if (!open) return null;

  return (
    <div className="friends-overlay" onClick={onClose}>
      <div className="friends-panel" onClick={(e) => e.stopPropagation()}>
        <div className="friends-header">
          <h2>Friends</h2>
          {requestCount > 0 && (
            <span className="badge" onClick={() => setTab('requests')}>
              {requestCount}
            </span>
          )}
          <button className="icon-btn" onClick={onClose}><FiX size={18} /></button>
        </div>

        <div className="friends-search">
          <FiSearch size={14} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search users..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {query.length >= 2 && searchResults.length > 0 && (
          <div className="friends-section">
            <h3>Search Results</h3>
            {searchResults
              .filter((u) => u.id !== user.id)
              .map((u) => {
                const isFriend = friends.some((f) => f.id === u.id);
                const isPending = outgoing.some((r) => r.to === u.id);
                return (
                  <div key={u.id} className="friend-row">
                    <span className="friend-name">{u.name}</span>
                    {isFriend ? (
                      <span className="badge-sm">Friend</span>
                    ) : isPending ? (
                      <span className="badge-sm">Pending</span>
                    ) : (
                      <button className="icon-btn-sm" onClick={async () => {
                        try {
                          await sendRequest(u.id);
                          toast.success(`Friend request sent to ${u.name}!`);
                        } catch (err) {
                          toast.error(err.message || 'Failed to send request');
                        }
                      }} title="Add Friend">
                        <FiUserPlus size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        <div className="friends-tabs">
          <button
            className={`tab-btn ${tab === 'friends' ? 'active' : ''}`}
            onClick={() => setTab('friends')}
          >
            Friends ({friends.length})
          </button>
          <button
            className={`tab-btn ${tab === 'requests' ? 'active' : ''}`}
            onClick={() => setTab('requests')}
          >
            Requests {requestCount > 0 && `(${requestCount})`}
          </button>
        </div>

        <div className="friends-list">
          {tab === 'friends' && (
            <>
              {loading && friends.length === 0 && <p className="empty-state">Loading...</p>}
              {!loading && friends.length === 0 && <p className="empty-state">No friends yet</p>}
              {friends.map((f) => (
                <AnimatedContent key={f.id} distance={20} duration={0.3}>
                  <div className="friend-row">
                    <span className="friend-name">{f.name}</span>
                    <div className="friend-actions">
                      <button
                        className="icon-btn-sm"
                        onClick={async () => {
                          setChallengingId(f.id);
                          try {
                            await sendChallenge(f.id);
                            toast.success(`Challenge sent to ${f.name}!`);
                          } catch (err) {
                            toast.error(err.message || 'Failed to send challenge');
                          } finally {
                            setChallengingId(null);
                          }
                        }}
                        title="Challenge"
                        disabled={challengingId === f.id}
                      >
                        {challengingId === f.id ? '…' : <FiZap size={14} />}
                      </button>
                      <button
                        className="icon-btn-sm danger"
                        onClick={() => remove(f.id)}
                        title="Remove"
                      >
                        <FiUserX size={14} />
                      </button>
                    </div>
                  </div>
                </AnimatedContent>
              ))}
            </>
          )}

          {tab === 'requests' && (
            <>
              {incoming.length > 0 && (
                <div className="friends-section">
                  <h3>Incoming</h3>
                  {incoming.map((r) => (
                    <div key={r.id} className="friend-row">
                      <span className="friend-name">{r.fromName || r.from}</span>
                      <div className="friend-actions">
                        <button className="icon-btn-sm" onClick={() => accept(r.id)} title="Accept">
                          <FiUserCheck size={14} />
                        </button>
                        <button className="icon-btn-sm danger" onClick={() => decline(r.id)} title="Decline">
                          <FiX size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {outgoing.length > 0 && (
                <div className="friends-section">
                  <h3>Outgoing</h3>
                  {outgoing.map((r) => (
                    <div key={r.id} className="friend-row">
                      <span className="friend-name">{r.toName || r.to}</span>
                      <span className="badge-sm">Pending</span>
                    </div>
                  ))}
                </div>
              )}
              {incoming.length === 0 && outgoing.length === 0 && (
                <p className="empty-state">No pending requests</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
