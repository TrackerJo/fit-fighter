import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useCompetitionStream } from '../hooks/useCompetitionStream';
import { calculateSetScore, calculateTotalScore } from '../utils/scoring';
import SetLogForm from '../components/SetLogForm';
import ScoreBar from '../components/ScoreBar';
import Counter from '../components/reactbits/Counter';
import AnimatedContent from '../components/reactbits/AnimatedContent';
import GradientText from '../components/reactbits/GradientText';
import SplitText from '../components/reactbits/SplitText';
import ShinyText from '../components/reactbits/ShinyText';
import { FiArrowLeft, FiStopCircle, FiRadio } from 'react-icons/fi';

export default function DuelDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();
  const [competition, setCompetition] = useState(null);
  const [opponentName, setOpponentName] = useState('Opponent');
  const [mySets, setMySets] = useState([]);
  const [myScore, setMyScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [result, setResult] = useState(null);
  const [opponentActivity, setOpponentActivity] = useState(null);
  const activityTimer = useRef(null);

  const loadDetail = useCallback(async () => {
    try {
      const data = await api.competitionDetail(id);
      setCompetition(data.competition);
      const comp = data.competition;
      const p = data.participants;
      const isUserA = comp.userA === user.id;

      const myUserSets = isUserA ? (p.userA?.sets || []) : (p.userB?.sets || []);
      const theirUserSets = isUserA ? (p.userB?.sets || []) : (p.userA?.sets || []);

      setMySets(myUserSets);
      setMyScore(isUserA ? (p.userA?.score || 0) : (p.userB?.score || 0));
      setTheirScore(isUserA ? (p.userB?.score || 0) : (p.userA?.score || 0));
      setOpponentName(isUserA ? (p.userB?.name || 'Opponent') : (p.userA?.name || 'Opponent'));

      if (comp.status === 'completed') {
        setResult({
          winner: comp.winnerId,
          winnerName: comp.winnerId === user.id ? 'You' : 'Opponent'
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id, user.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  // ── Real-time SSE stream ────────────────────────────────────────────────
  const handleSSEEvent = useCallback((event, data) => {
    if (event === 'connected') return;

    if (event === 'set-logged' || event === 'sets-logged') {
      // Refresh data from server to get accurate scores
      loadDetail();

      // If the event is from the opponent, show activity notification
      if (data.userId !== user.id) {
        const set = data.set || (data.sets && data.sets[0]);
        const activity = set
          ? `${data.userName} logged ${set.exercise}: ${set.weight} lbs × ${set.reps} reps`
          : `${data.userName} logged ${data.count || 'new'} set(s)`;
        setOpponentActivity(activity);
        clearTimeout(activityTimer.current);
        activityTimer.current = setTimeout(() => setOpponentActivity(null), 4000);
      }
    } else if (event === 'set-deleted') {
      loadDetail();
      if (data.userId !== user.id) {
        setOpponentActivity(`${opponentName} removed a set`);
        clearTimeout(activityTimer.current);
        activityTimer.current = setTimeout(() => setOpponentActivity(null), 4000);
      }
    } else if (event === 'competition-ended') {
      loadDetail();
    }
  }, [loadDetail, user.id, opponentName]);

  const isActive = competition?.status === 'active';
  const { connected } = useCompetitionStream(
    isActive ? id : null,
    handleSSEEvent
  );

  // Clean up activity timer on unmount
  useEffect(() => () => clearTimeout(activityTimer.current), []);

  const handleLogSet = async (setData) => {
    // Optimistic update
    const optimisticScore = calculateSetScore(setData.weight, setData.reps);
    const tempSet = { ...setData, id: 'temp-' + Date.now(), score: optimisticScore };

    setMySets((prev) => [tempSet, ...prev]);
    setMyScore((prev) => prev + optimisticScore);

    try {
      await api.logSet(id, setData.exercise, setData.weight, setData.reps);
      toast.success(`Logged ${setData.exercise}: ${setData.weight} lbs × ${setData.reps} reps`);
      loadDetail(); // Reconcile with server
    } catch (e) {
      toast.error(e.message || 'Failed to log set');
      // Rollback
      setMySets((prev) => prev.filter((s) => s.id !== tempSet.id));
      setMyScore((prev) => prev - optimisticScore);
    }
  };

  const handleEnd = async () => {
    if (!window.confirm('End this competition? The winner will be determined by total score.')) return;
    setEnding(true);
    try {
      const data = await api.endCompetition(id);
      const r = data.result;
      const winnerId = r?.winner?.id || null;
      setResult({
        winner: winnerId,
        winnerName: winnerId === user.id ? 'You' : (
          winnerId === null ? null : (r?.winner?.name || 'Opponent')
        )
      });
      loadDetail();
      const winMsg = winnerId === user.id ? 'You won!' : winnerId === null ? "It's a tie!" : `${r?.winner?.name || 'Opponent'} wins!`;
      toast.success(`Competition ended — ${winMsg}`);
    } catch (e) { console.error(e); toast.error(e.message || 'Failed to end competition'); }
    finally { setEnding(false); }
  };

  if (loading) {
    return <div className="page"><p className="empty-state">Loading competition...</p></div>;
  }

  if (!competition) {
    return <div className="page"><p className="empty-state">Competition not found</p></div>;
  }

  return (
    <div className="page duel-detail-page">
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate('/dashboard')}>
          <FiArrowLeft size={18} />
        </button>
        <SplitText
          text={`vs ${opponentName}`}
          className="page-title"
          delay={40}
          duration={0.4}
          ease="power2.out"
          splitType="chars"
          from={{ opacity: 0, y: 15 }}
          to={{ opacity: 1, y: 0 }}
        />
        {isActive && connected && (
          <span className="live-indicator" title="Real-time connected">
            <FiRadio size={12} />
            <span>LIVE</span>
          </span>
        )}
        {isActive && (
          <button
            className="btn btn-danger btn-sm"
            onClick={handleEnd}
            disabled={ending}
          >
            <FiStopCircle size={14} />
            {ending ? 'Ending...' : 'End Duel'}
          </button>
        )}
      </div>

      {result && (
        <AnimatedContent distance={40} duration={0.5}>
          <div className="result-banner">
            {result.winner === null ? (
              <GradientText
                colors={['#888', '#ccc', '#888']}
                animationSpeed={4}
              >
                IT'S A TIE
              </GradientText>
            ) : result.winner === user.id ? (
              <GradientText
                colors={['#ccc', '#fff', '#ccc']}
                animationSpeed={3}
              >
                YOU WIN
              </GradientText>
            ) : (
              <span className="result-loss">{opponentName} wins</span>
            )}
          </div>
        </AnimatedContent>
      )}

      {opponentActivity && (
        <AnimatedContent distance={20} duration={0.3}>
          <div className="opponent-activity-banner">
            <FiRadio size={12} className="activity-pulse" />
            <span>{opponentActivity}</span>
          </div>
        </AnimatedContent>
      )}

      <div className="duel-scoreboard">
        <div className="scoreboard-side">
          <span className="scoreboard-label">You</span>
          <Counter
            value={Math.round(myScore)}
            fontSize={32}
            textColor="#fff"
            fontWeight={700}
          />
        </div>
        <div className="scoreboard-vs">vs</div>
        <div className="scoreboard-side">
          <span className="scoreboard-label">{opponentName.split(' ')[0]}</span>
          <Counter
            value={Math.round(theirScore)}
            fontSize={32}
            textColor="#888"
            fontWeight={700}
          />
        </div>
      </div>

      <ScoreBar
        myScore={myScore}
        theirScore={theirScore}
        myName="You"
        theirName={opponentName.split(' ')[0]}
      />

      {isActive && (
        <AnimatedContent distance={20} duration={0.3}>
          <section className="duel-section">
            <h3 className="section-title">Log a Set</h3>
            <SetLogForm onSubmit={handleLogSet} disabled={!isActive} />
          </section>
        </AnimatedContent>
      )}

      <section className="duel-section">
        <h3 className="section-title">Your Sets ({mySets.length})</h3>
        {mySets.length === 0 && (
          <p className="empty-state">No sets logged yet</p>
        )}
        <div className="sets-list">
          {mySets.map((s, i) => (
            <AnimatedContent key={s.id || i} distance={15} duration={0.2} delay={i * 0.05}>
              <div className="set-row">
                <span className="set-exercise">{s.exercise}</span>
                <span className="set-detail">{s.weight} lbs × {s.reps} reps</span>
                <span className="set-score">
                  <ShinyText speed={5} color="#555">
                    +{calculateSetScore(s.weight, s.reps)}
                  </ShinyText>
                </span>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </section>
    </div>
  );
}
