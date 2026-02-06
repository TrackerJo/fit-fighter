import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api } from '../api/client';
import { calculateSetScore, calculateTotalScore } from '../utils/scoring';
import SetLogForm from '../components/SetLogForm';
import ScoreBar from '../components/ScoreBar';
import Counter from '../components/reactbits/Counter';
import AnimatedContent from '../components/reactbits/AnimatedContent';
import GradientText from '../components/reactbits/GradientText';
import SplitText from '../components/reactbits/SplitText';
import ShinyText from '../components/reactbits/ShinyText';
import { FiArrowLeft, FiStopCircle } from 'react-icons/fi';

export default function DuelDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [mySets, setMySets] = useState([]);
  const [myScore, setMyScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [result, setResult] = useState(null);

  const loadDetail = useCallback(async () => {
    try {
      const data = await api.competitionDetail(id);
      setCompetition(data.competition);
      const comp = data.competition;
      const isUser1 = comp.user1Id === user.id;

      const myUserSets = isUser1 ? (comp.user1Sets || []) : (comp.user2Sets || []);
      const theirUserSets = isUser1 ? (comp.user2Sets || []) : (comp.user1Sets || []);

      setMySets(myUserSets);
      setMyScore(calculateTotalScore(myUserSets));
      setTheirScore(calculateTotalScore(theirUserSets));

      if (comp.status === 'completed') {
        setResult({
          winner: comp.winnerId,
          winnerName: comp.winnerName || (comp.winnerId === user.id ? 'You' : 'Opponent')
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id, user.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const handleLogSet = async (setData) => {
    // Optimistic update
    const optimisticScore = calculateSetScore(setData.weight, setData.reps);
    const tempSet = { ...setData, id: 'temp-' + Date.now(), score: optimisticScore };

    setMySets((prev) => [tempSet, ...prev]);
    setMyScore((prev) => prev + optimisticScore);

    try {
      await api.logSet(id, setData.exercise, setData.weight, setData.reps);
      loadDetail(); // Reconcile with server
    } catch (e) {
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
      setResult({
        winner: data.competition.winnerId,
        winnerName: data.competition.winnerId === user.id ? 'You' : (
          data.competition.winnerId === null ? null : 'Opponent'
        )
      });
      setCompetition(data.competition);
    } catch (e) { console.error(e); }
    finally { setEnding(false); }
  };

  if (loading) {
    return <div className="page"><p className="empty-state">Loading competition...</p></div>;
  }

  if (!competition) {
    return <div className="page"><p className="empty-state">Competition not found</p></div>;
  }

  const isUser1 = competition.user1Id === user.id;
  const opponentName = isUser1
    ? (competition.user2Name || 'Opponent')
    : (competition.user1Name || 'Opponent');
  const isActive = competition.status === 'active';

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
