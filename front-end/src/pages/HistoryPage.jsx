import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useCompetitions } from '../hooks/useCompetitions';
import SplitText from '../components/reactbits/SplitText';
import AnimatedContent from '../components/reactbits/AnimatedContent';
import GradientText from '../components/reactbits/GradientText';
import ShinyText from '../components/reactbits/ShinyText';
import CountUp from '../components/reactbits/CountUp';

export default function HistoryPage() {
  const { user } = useContext(AuthContext);
  const { history, loading } = useCompetitions();

  const wins = history.filter((c) => c.winnerId === user.id).length;
  const losses = history.filter((c) => c.winnerId && c.winnerId !== user.id).length;
  const ties = history.filter((c) => c.winnerId === null && c.status === 'completed').length;

  return (
    <div className="page history-page">
      <div className="page-header">
        <SplitText
          text="Competition History"
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
            <CountUp to={wins} duration={1} />
          </span>
          <span className="stat-label">Wins</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            <CountUp to={losses} duration={1} />
          </span>
          <span className="stat-label">Losses</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            <CountUp to={ties} duration={1} />
          </span>
          <span className="stat-label">Ties</span>
        </div>
      </div>

      {loading && history.length === 0 && (
        <p className="empty-state">Loading...</p>
      )}
      {!loading && history.length === 0 && (
        <div className="empty-state-card">
          <ShinyText speed={3} color="#555">
            No completed competitions yet
          </ShinyText>
        </div>
      )}

      <div className="history-list">
        {history.map((comp) => {
          const isUserA = comp.userA === user.id;
          const opponentName = comp.opponentName || (isUserA ? 'Opponent' : 'Opponent');
          const myScore = isUserA ? (comp.scoreA || 0) : (comp.scoreB || 0);
          const theirScore = isUserA ? (comp.scoreB || 0) : (comp.scoreA || 0);
          const isWin = comp.winnerId === user.id;
          const isTie = comp.winnerId === null;

          return (
            <AnimatedContent key={comp.id} distance={25} duration={0.3}>
              <div className={`history-card ${isWin ? 'win' : isTie ? 'tie' : 'loss'}`}>
                <div className="history-card-header">
                  <span className="history-opponent">vs {opponentName}</span>
                  <span className="history-result">
                    {isWin ? (
                      <GradientText colors={['#ccc', '#fff', '#ccc']} animationSpeed={4}>
                        WIN
                      </GradientText>
                    ) : isTie ? (
                      'TIE'
                    ) : (
                      'LOSS'
                    )}
                  </span>
                </div>
                <div className="history-card-scores">
                  <span>{myScore.toFixed(1)}</span>
                  <span className="history-divider">—</span>
                  <span>{theirScore.toFixed(1)}</span>
                </div>
              </div>
            </AnimatedContent>
          );
        })}
      </div>
    </div>
  );
}
