import { FiCheck, FiX, FiZap } from 'react-icons/fi';

export default function RequestCard({ request, type, onAccept, onDecline }) {
  const isCompetition = type === 'competition';
  const name = request.senderName || request.senderId || 'Unknown';

  return (
    <div className="request-card">
      <div className="request-info">
        <span className="request-icon">
          {isCompetition ? <FiZap size={14} /> : null}
        </span>
        <div>
          <span className="request-name">{name}</span>
          <span className="request-type">
            {isCompetition ? 'Competition Request' : 'Friend Request'}
          </span>
        </div>
      </div>
      <div className="request-actions">
        <button className="icon-btn-sm accept" onClick={() => onAccept(request.id)} title="Accept">
          <FiCheck size={14} />
        </button>
        <button className="icon-btn-sm danger" onClick={() => onDecline(request.id)} title="Decline">
          <FiX size={14} />
        </button>
      </div>
    </div>
  );
}
