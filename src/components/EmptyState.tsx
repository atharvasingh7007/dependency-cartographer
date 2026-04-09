import { useState } from 'react';
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
  const [showHow, setShowHow] = useState(false);

  return (
    <div className="empty-state">
      <div className="empty-icon">🗺️</div>
      <h2 className="empty-title">Explore the world behind npm</h2>
      <p className="empty-desc">
        Enter any npm package to see where its maintainers are located across the globe.
      </p>

      {/* Feature badges */}
      <div className="feature-badges">
        <span className="feature-badge">🔒 Supply Chain Risk</span>
        <span className="feature-badge">📍 Geo Mapping</span>
        <span className="feature-badge">⚡ Cached</span>
        <span className="feature-badge">📊 Insights</span>
      </div>

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

      {/* How it works */}
      <button className="how-toggle" onClick={() => setShowHow(!showHow)}>
        {showHow ? 'Hide' : 'How it works'} {showHow ? '▲' : '▼'}
      </button>

      {showHow && (
        <div className="how-section">
          <div className="how-step">
            <span className="how-num">1</span>
            <div>
              <strong>Fetch dependencies</strong>
              <p>Crawls the npm registry for all production dependencies</p>
            </div>
          </div>
          <div className="how-step">
            <span className="how-num">2</span>
            <div>
              <strong>Find maintainers</strong>
              <p>Looks up GitHub profiles and extracts their locations</p>
            </div>
          </div>
          <div className="how-step">
            <span className="how-num">3</span>
            <div>
              <strong>Map the world</strong>
              <p>Geocodes locations and plots them on an interactive map</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
