export default function ScoreBar({ myScore, theirScore, myName, theirName }) {
  const total = myScore + theirScore;
  const myPercent = total > 0 ? (myScore / total) * 100 : 50;

  return (
    <div className="score-bar-container">
      <div className="score-bar-labels">
        <span className="score-bar-name">{myName}</span>
        <span className="score-bar-name">{theirName}</span>
      </div>
      <div className="score-bar">
        <div
          className="score-bar-fill mine"
          style={{ width: `${myPercent}%` }}
        />
        <div
          className="score-bar-fill theirs"
          style={{ width: `${100 - myPercent}%` }}
        />
      </div>
      <div className="score-bar-values">
        <span>{myScore.toFixed(1)}</span>
        <span>{theirScore.toFixed(1)}</span>
      </div>
    </div>
  );
}
