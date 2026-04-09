import './EmptyState.css';

interface EmptyStateProps {
  onQuickSearch: (pkg: string, depth: number) => void;
}

const suggestions = [
  { name: 'react', desc: 'UI Library' },
  { name: 'express', desc: 'Web Framework' },
  { name: 'next', desc: 'Full-stack Framework' },
  { name: 'lodash', desc: 'Utility Library' },
  { name: 'axios', desc: 'HTTP Client' },
  { name: 'vite', desc: 'Build Tool' },
];

export function EmptyState({ onQuickSearch }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">🗺️</div>
      <h2 className="empty-title">Explore the world behind npm</h2>
      <p className="empty-desc">
        Enter any npm package to see where its maintainers are located across the globe.
      </p>
      <div className="suggestion-chips">
        <span className="suggestion-label">Try:</span>
        {suggestions.map((s) => (
          <button
            key={s.name}
            className="suggestion-chip"
            onClick={() => onQuickSearch(s.name, 2)}
            title={s.desc}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
