import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSolo } from '../hooks/useSolo';
import SplitText from '../components/reactbits/SplitText';
import AnimatedContent from '../components/reactbits/AnimatedContent';
import ShinyText from '../components/reactbits/ShinyText';
import CountUp from '../components/reactbits/CountUp';
import GradientText from '../components/reactbits/GradientText';
import { FiPlay, FiAward, FiTrendingUp } from 'react-icons/fi';

export default function SoloPage() {
  const navigate = useNavigate();
  const { activeSessions, history, records, loading, startSession } = useSolo();
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    try {
      const session = await startSession('Solo Workout');
      navigate(`/solo/${session.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page solo-page">
      <div className="page-header">
        <SplitText
          text="Solo Training"
          className="page-title"
          delay={50}
          duration={0.5}
          ease="power2.out"
          splitType="chars"
          from={{ opacity: 0, y: 20 }}
          to={{ opacity: 1, y: 0 }}
        />
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">
            <CountUp to={records?.totalSessions || 0} duration={1} />
          </span>
          <span className="stat-label">Sessions</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            <CountUp to={records?.totalSets || 0} duration={1} />
          </span>
          <span className="stat-label">Total Sets</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            <CountUp to={Math.round(records?.allTimeScore || 0)} duration={1.5} />
          </span>
          <span className="stat-label">All-Time Score</span>
        </div>
      </div>

      {/* Start New Session */}
      <AnimatedContent distance={20} duration={0.3}>
        <div className="solo-start-section">
          <button
            className="btn btn-primary btn-full solo-start-btn"
            onClick={handleStart}
            disabled={starting}
          >
            <FiPlay size={16} />
            {starting ? 'Starting...' : 'Start Solo Session'}
          </button>
        </div>
      </AnimatedContent>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <AnimatedContent distance={25} duration={0.3}>
          <section className="dashboard-section">
            <h2 className="section-title">Active Sessions</h2>
            <div className="solo-session-list">
              {activeSessions.map((s) => (
                <div
                  key={s.id}
                  className="solo-session-card active"
                  onClick={() => navigate(`/solo/${s.id}`)}
                >
                  <div className="solo-session-header">
                    <span className="solo-session-name">{s.name}</span>
                    <span className="duel-status winning">ACTIVE</span>
                  </div>
                  <div className="solo-session-score">
                    <FiTrendingUp size={14} />
                    <span>{s.score.toFixed(1)} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </AnimatedContent>
      )}

      {/* Personal Records */}
      {records?.personalRecords?.length > 0 && (
        <AnimatedContent distance={25} duration={0.4}>
          <section className="dashboard-section">
            <h2 className="section-title">
              <FiAward size={13} style={{ marginRight: 6, verticalAlign: -1 }} />
              Personal Records
            </h2>
            <div className="solo-records-list">
              {records.personalRecords.map((pr) => (
                <div key={pr.exercise} className="solo-record-row">
                  <span className="set-exercise">{pr.exercise}</span>
                  <span className="set-detail">{pr.weight} lbs × {pr.reps}</span>
                  <span className="set-score">
                    <ShinyText speed={5} color="#555">
                      {pr.score.toFixed(1)}
                    </ShinyText>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </AnimatedContent>
      )}

      {/* Best Session */}
      {records?.bestSession && (
        <AnimatedContent distance={25} duration={0.4}>
          <section className="dashboard-section">
            <h2 className="section-title">Best Session</h2>
            <div className="solo-best-session-card">
              <GradientText colors={['#ccc', '#fff', '#ccc']} animationSpeed={4}>
                {records.bestSession.score.toFixed(1)} pts
              </GradientText>
              <span className="solo-best-date">
                {new Date(records.bestSession.endedAt).toLocaleDateString()}
              </span>
            </div>
          </section>
        </AnimatedContent>
      )}

      {/* Session History */}
      <section className="dashboard-section">
        <h2 className="section-title">Session History</h2>
        {loading && history.length === 0 && (
          <p className="empty-state">Loading...</p>
        )}
        {!loading && history.length === 0 && (
          <div className="empty-state-card">
            <ShinyText speed={3} color="#555">
              No completed sessions yet — start your first workout!
            </ShinyText>
          </div>
        )}
        <div className="history-list">
          {history.map((s) => (
            <AnimatedContent key={s.id} distance={20} duration={0.3}>
              <div
                className="solo-history-card"
                onClick={() => navigate(`/solo/${s.id}`)}
              >
                <div className="history-card-header">
                  <span className="history-opponent">{s.name}</span>
                  <span className="solo-history-date">
                    {new Date(s.endedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="solo-history-score">
                  <span className="solo-history-pts">{s.score.toFixed(1)} pts</span>
                </div>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </section>
    </div>
  );
}
