// Tiny inline star-rating widget. Renders 5 stars filled to the given
// `rating` (0-5, fractional OK). If `onChange` is passed the stars are
// clickable and act as input; otherwise it's display-only.

const Star = ({ filled, onClick, size = 18 }) => (
  <span
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    aria-label={onClick ? 'Rate this many stars' : undefined}
    style={{
      cursor: onClick ? 'pointer' : 'default',
      fontSize: `${size}px`,
      lineHeight: 1,
      color: filled ? '#F5B041' : '#D1D5DB',
      userSelect: 'none'
    }}
  >★</span>
);

const StarRating = ({ rating = 0, onChange, size = 18 }) => (
  <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} filled={n <= rating} size={size} onClick={onChange ? () => onChange(n) : undefined} />
    ))}
  </span>
);

export default StarRating;
