import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export function StarRating({ value, onChange, readonly }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <span className={`star-rating${readonly ? ' readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = hover || value;
        const fillwidth = active >= star * 2 ? '100%' : active >= star * 2 - 1 ? '50%' : '0%';
        return (
          <span
            key={star}
            className="star"
            onClick={() => !readonly && onChange?.(hover)}
            onMouseMove={(e) => {
              if (readonly) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const isLeftHalf = e.clientX < rect.left + rect.width / 2;
              const hoverVal = isLeftHalf ? star * 2 - 1 : star * 2;
              setHover(isLeftHalf ? star * 2 - 1 : star * 2);
            }}
            onMouseLeave={() => !readonly && setHover(0)}
          >
            {'\u2605'}
            <span className="star-fill" style={{ width: fillwidth }}>{'\u2605'}</span>
          </span>
        )
      })}
    </span>
  );
}
