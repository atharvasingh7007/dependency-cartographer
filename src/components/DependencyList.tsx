import type { DepNode } from '../types';
import './DependencyList.css';

interface DependencyListProps {
  deps: DepNode[];
  onSelect?: (dep: DepNode) => void;
  resolvedCount: number;
  unknownCount: number;
}

export function DependencyList({
  deps,
  onSelect,
  resolvedCount,
  unknownCount,
}: DependencyListProps) {
  return (
    <div className="dep-list">
      <div className="dep-stats">
        <span className="stat">{deps.length} packages</span>
        <span className="stat resolved">{resolvedCount} located</span>
        {unknownCount > 0 && (
          <span className="stat unknown">{unknownCount} unknown</span>
        )}
      </div>
      <div className="dep-scroll">
        {deps.map((dep) => (
          <div
            key={dep.name}
            className="dep-item"
            onClick={() => onSelect?.(dep)}
          >
            <div className="dep-name">{dep.name}</div>
            <div className="dep-meta">
              <span className={`status-badge ${dep.status}`}>
                {dep.status}
              </span>
              {dep.location && (
                <span className="dep-location">{dep.location}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
