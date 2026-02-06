import { useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useCompetitions } from '../hooks/useCompetitions';
import { useToast } from '../context/ToastContext';
import DuelCard from '../components/DuelCard';
import RequestCard from '../components/RequestCard';
import CountUp from '../components/reactbits/CountUp';
import SplitText from '../components/reactbits/SplitText';
import AnimatedContent from '../components/reactbits/AnimatedContent';
import ShinyText from '../components/reactbits/ShinyText';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const {
    active, incomingRequests, loading,
    acceptChallenge, declineChallenge, refresh
  } = useCompetitions();
  const toast = useToast();

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
        <h2 className="section-title">Active Duels</h2>
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
              <DuelCard competition={comp} userId={user.id} />
            </AnimatedContent>
          ))}
        </div>
      </section>
    </div>
  );
}
