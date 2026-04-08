import { useState } from 'react';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (pkg: string, depth: number) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [packageName, setPackageName] = useState('');
  const [depth, setDepth] = useState(2);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (packageName.trim() && !isLoading) {
      onSearch(packageName.trim(), depth);
    }
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="input-row">
        <input
          type="text"
          placeholder="Enter npm package (e.g. react, lodash)"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          disabled={isLoading}
          className="package-input"
        />
        <button type="submit" disabled={isLoading || !packageName.trim()} className="explore-btn">
          {isLoading ? 'Exploring...' : 'Explore'}
        </button>
      </div>
      <div className="depth-row">
        <span className="depth-label">Depth:</span>
        {[1, 2, 3].map((d) => (
          <button
            key={d}
            type="button"
            className={`depth-chip ${depth === d ? 'active' : ''}`}
            onClick={() => setDepth(d)}
            disabled={isLoading}
          >
            {d}
          </button>
        ))}
        <span className="depth-hint">
          {depth === 1 ? '~50 deps' : depth === 2 ? '~200–500 deps' : '~1,000+ deps'}
        </span>
      </div>
    </form>
  );
}
