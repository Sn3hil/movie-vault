import { useState } from 'react';
import { StarRating } from './StarRating';

interface MoveToWatchedModalProps {
  movieName: string;
  initialRating?: number;
  onConfirm: (rating: number) => void;
  onCancel: () => void;
}

export function MoveToWatchedModal({ movieName, initialRating = 0, onConfirm, onCancel }: MoveToWatchedModalProps) {
  const [rating, setRating] = useState(initialRating);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{'>'} Move to Watched</div>
        <div className="modal-body">
          Rate <strong>{movieName}</strong> before moving:
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button
            className={`btn btn-success${rating === 0 ? ' disabled' : ''}`}
            onClick={() => rating > 0 && onConfirm(rating)}
            disabled={rating === 0}
            style={rating === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
