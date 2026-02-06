import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { calculateSetScore, calculateTotalScore } from '../utils/scoring';
import SetLogForm from '../components/SetLogForm';
import Counter from '../components/reactbits/Counter';
import AnimatedContent from '../components/reactbits/AnimatedContent';
import GradientText from '../components/reactbits/GradientText';
import SplitText from '../components/reactbits/SplitText';
import ShinyText from '../components/reactbits/ShinyText';
import { FiArrowLeft, FiStopCircle, FiTrash2 } from 'react-icons/fi';

export default function SoloSessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [sets, setSets] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const data = await api.soloSessionDetail(id);
      setSession(data.session);
      setSets(data.sets || []);
      setTotalScore(data.totalScore || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const handleLogSet = async (setData) => {
    // Optimistic update
    const optimisticScore = calculateSetScore(setData.weight, setData.reps);
    const tempSet = {
      ...setData,
      id: 'temp-' + Date.now(),
      score: optimisticScore,
      loggedAt: new Date().toISOString()
    };

    setSets((prev) => [tempSet, ...prev]);
    setTotalScore((prev) => prev + optimisticScore);

    try {
      await api.logSoloSet(id, setData.exercise, setData.weight, setData.reps);
      loadDetail(); // Reconcile with server
    } catch (e) {
      // Rollback
      setSets((prev) => prev.filter((s) => s.id !== tempSet.id));
      setTotalScore((prev) => prev - optimisticScore);
    }
  };

  const handleDeleteSet = async (setId) => {
    const setToDelete = sets.find((s) => s.id === setId);
    if (!setToDelete) return;

    // Optimistic removal
    setSets((prev) => prev.filter((s) => s.id !== setId));
    setTotalScore((prev) => prev - (setToDelete.score || 0));

    try {
      await api.deleteSoloSet(setId);
      loadDetail();
    } catch (e) {
      // Rollback
      setSets((prev) => [...prev, setToDelete].sort(
        (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt)
      ));
      setTotalScore((prev) => prev + (setToDelete.score || 0));
    }
  };

  const handleEnd = async () => {
    if (!window.confirm('End this solo session? Your score will be saved.')) return;
    setEnding(true);
    try {
      const data = await api.endSoloSession(id);
      setSession(data.session);
    } catch (e) {
      console.error(e);
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return <div className="page"><p className="empty-state">Loading session...</p></div>;
  }

  if (!session) {
    return <div className="page"><p className="empty-state">Session not found</p></div>;
  }

  const isActive = session.status === 'active';

  return (
    <div className="page solo-detail-page">
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate('/solo')}>
          <FiArrowLeft size={18} />
        </button>
        <SplitText
          text={session.name}
          className="page-title"
          delay={40}
          duration={0.4}
          ease="power2.out"
          splitType="chars"
          from={{ opacity: 0, y: 15 }}
          to={{ opacity: 1, y: 0 }}
        />
        {isActive && (
          <button
            className="btn btn-danger btn-sm"
            onClick={handleEnd}
            disabled={ending}
          >
            <FiStopCircle size={14} />
            {ending ? 'Ending...' : 'Finish'}
          </button>
        )}
      </div>

      {/* Completed banner */}
      {!isActive && (
        <AnimatedContent distance={40} duration={0.5}>
          <div className="result-banner">
            <GradientText colors={['#ccc', '#fff', '#ccc']} animationSpeed={3}>
              SESSION COMPLETE
            </GradientText>
          </div>
        </AnimatedContent>
      )}

      {/* Score Display */}
      <div className="solo-score-display">
        <span className="scoreboard-label">Total Score</span>
        <Counter
          value={Math.round(totalScore)}
          fontSize={42}
          textColor="#fff"
          fontWeight={700}
        />
        <span className="solo-set-count">{sets.length} set{sets.length !== 1 ? 's' : ''} logged</span>
      </div>

      {/* Log Form */}
      {isActive && (
        <AnimatedContent distance={20} duration={0.3}>
          <section className="duel-section">
            <h3 className="section-title">Log a Set</h3>
            <SetLogForm onSubmit={handleLogSet} disabled={!isActive} />
          </section>
        </AnimatedContent>
      )}

      {/* Sets List */}
      <section className="duel-section">
        <h3 className="section-title">Your Sets ({sets.length})</h3>
        {sets.length === 0 && (
          <p className="empty-state">No sets logged yet</p>
        )}
        <div className="sets-list">
          {sets.map((s, i) => (
            <AnimatedContent key={s.id || i} distance={15} duration={0.2} delay={i * 0.05}>
              <div className="set-row">
                <span className="set-exercise">{s.exercise}</span>
                <span className="set-detail">{s.weight} lbs × {s.reps} reps</span>
                <span className="set-score">
                  <ShinyText speed={5} color="#555">
                    +{calculateSetScore(s.weight, s.reps).toFixed(1)}
                  </ShinyText>
                </span>
                {isActive && !String(s.id).startsWith('temp-') && (
                  <button
                    className="icon-btn-sm danger"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSet(s.id); }}
                    title="Delete set"
                  >
                    <FiTrash2 size={12} />
                  </button>
                )}
              </div>
            </AnimatedContent>
          ))}
        </div>
      </section>
    </div>
  );
}
