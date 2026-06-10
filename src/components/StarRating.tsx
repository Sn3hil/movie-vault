import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export function StarRating({ value, onChange, readonly }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  function handleClick(rating: number) {
    if (!readonly && onChange) {
      onChange(rating);
    }
  }

  return (
    <span className={`star-rating${readonly ? ' readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star${star <= (hover || value) ? ' filled' : ''}${star <= hover ? ' hover' : ''}`}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          {star <= (hover || value) ? '\u2605' : '\u2606'}
        </span>
      ))}
    </span>
  );
}
