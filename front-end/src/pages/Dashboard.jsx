import { useContext, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useCompetitions } from '../hooks/useCompetitions';
import { useDashboardStreams } from '../hooks/useDashboardStreams';
import { useToast } from '../context/ToastContext';
import { useNotification } from '../context/NotificationContext';
import DuelCard from '../components/DuelCard';
import RequestCard from '../components/RequestCard';
import CountUp from '../components/reactbits/CountUp';
import SplitText from '../components/reactbits/SplitText';
import AnimatedContent from '../components/reactbits/AnimatedContent';
import ShinyText from '../components/reactbits/ShinyText';
import { FiRadio } from 'react-icons/fi';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const {
    active, incomingRequests, loading,
    acceptChallenge, declineChallenge, refresh
  } = useCompetitions();
  const toast = useToast();
  const notification = useNotification();

  // Show toasts for live competition-related notifications
  useEffect(() => {
    if (!notification?.lastEvent) return;
    const { type, data } = notification.lastEvent;
    if (type === 'competition-request-received') {
      toast.info(`${data.fromName} challenged you to a duel!`);
    } else if (type === 'competition-request-accepted') {
      toast.success(`${data.byName} accepted your challenge!`);
    }
  }, [notification?.lastEvent, toast]);

  // Track which cards just received an update (for flash effect)
  const [flashIds, setFlashIds] = useState(new Set());
  const flashTimers = useRef({});

  // SSE: subscribe to every active competition
  const activeIds = useMemo(() => active.map((c) => c.id), [active]);

  const handleSSEEvent = useCallback((compId, event, data) => {
    if (['set-logged', 'sets-logged', 'set-deleted', 'competition-ended'].includes(event)) {
      refresh();
      // Flash the updated card briefly
      setFlashIds((prev) => new Set(prev).add(compId));
      clearTimeout(flashTimers.current[compId]);
      flashTimers.current[compId] = setTimeout(() => {
        setFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(compId);
          return next;
        });
      }, 1500);
    }
  }, [refresh]);

  const { liveCount } = useDashboardStreams(activeIds, handleSSEEvent);

  const handleAccept = useCallback(async (requestId) => {
    try {
      await acceptChallenge(requestId);
      toast.success('Challenge accepted — competition started!');
    } catch (err) {
      toast.error(err.message || 'Failed to accept challenge');
    }
  }, [acceptChallenge, toast]);

  const handleDecline = useCallback(async (requestId) => {
    try {
      await declineChallenge(requestId);
      toast.info('Challenge declined');
    } catch (err) {
      toast.error(err.message || 'Failed to decline challenge');
    }
  }, [declineChallenge, toast]);

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <SplitText
          text={`Welcome, ${user?.name?.split(' ')[0] || 'Fighter'}`}
          className="page-title"
          delay={50}
          duration={0.5}
          ease="power2.out"
          splitType="chars"
          from={{ opacity: 0, y: 20 }}
          to={{ opacity: 1, y: 0 }}
        />
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">
            <CountUp to={active.length} duration={1} />
          </span>
          <span className="stat-label">Active Duels</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            <CountUp to={incomingRequests.length} duration={1} />
          </span>
          <span className="stat-label">Incoming Challenges</span>
        </div>
      </div>

      {incomingRequests.length > 0 && (
        <AnimatedContent distance={30} duration={0.4}>
          <section className="dashboard-section">
            <h2 className="section-title">Incoming Challenges</h2>
            <div className="request-list">
              {incomingRequests.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  type="competition"
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))}
            </div>
          </section>
        </AnimatedContent>
      )}

      <section className="dashboard-section">
        <div className="section-title-row">
          <h2 className="section-title">Active Duels</h2>
          {liveCount > 0 && (
            <span className="live-indicator">
              <FiRadio size={12} /> LIVE
            </span>
          )}
        </div>
        {loading && active.length === 0 && (
          <p className="empty-state">Loading...</p>
        )}
        {!loading && active.length === 0 && (
          <div className="empty-state-card">
            <ShinyText speed={3} color="#555">
              No active duels — challenge a friend from the Friends panel
            </ShinyText>
          </div>
        )}
        <div className="duel-grid">
          {active.map((comp) => (
            <AnimatedContent key={comp.id} distance={30} duration={0.4}>
              <DuelCard competition={comp} userId={user.id} flash={flashIds.has(comp.id)} />
            </AnimatedContent>
          ))}
        </div>
      </section>
    </div>
  );
}
