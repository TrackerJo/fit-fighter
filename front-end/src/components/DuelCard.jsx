import { useNavigate } from 'react-router-dom';
import Counter from './reactbits/Counter';
import ShinyText from './reactbits/ShinyText';

export default function DuelCard({ competition, userId }) {
  const navigate = useNavigate();

  const isUserA = competition.userA === userId;
  const opponentName = competition.opponentName || 'Opponent';

  const myScore = isUserA
    ? (competition.scoreA || 0)
    : (competition.scoreB || 0);
  const theirScore = isUserA
    ? (competition.scoreB || 0)
    : (competition.scoreA || 0);

  const isWinning = myScore > theirScore;
  const isTied = myScore === theirScore;

  return (
    <div
      className="duel-card"
      onClick={() => navigate(`/duel/${competition.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/duel/${competition.id}`)}
    >
      <div className="duel-card-header">
        <span className="duel-opponent">vs {opponentName}</span>
        <span className={`duel-status ${isWinning ? 'winning' : isTied ? 'tied' : 'losing'}`}>
          {isWinning ? 'LEADING' : isTied ? 'TIED' : 'TRAILING'}
        </span>
      </div>
      <div className="duel-card-scores">
        <div className="duel-score-block">
          <span className="score-label">You</span>
          <Counter
            value={Math.round(myScore)}
            fontSize={22}
            textColor={isWinning ? '#fff' : '#888'}
            fontWeight={600}
          />
        </div>
        <div className="duel-divider">—</div>
        <div className="duel-score-block">
          <span className="score-label">{opponentName.split(' ')[0]}</span>
          <Counter
            value={Math.round(theirScore)}
            fontSize={22}
            textColor={!isWinning && !isTied ? '#fff' : '#888'}
            fontWeight={600}
          />
        </div>
      </div>
      <div className="duel-card-footer">
        <ShinyText speed={4} color="#555">
          Tap to open
        </ShinyText>
      </div>
    </div>
  );
}
