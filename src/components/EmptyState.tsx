interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="line">{'\u2514'} {message} {'\u2518'}</span>
    </div>
  );
}
