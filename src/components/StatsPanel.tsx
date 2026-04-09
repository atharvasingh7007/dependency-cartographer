import type { Marker } from '../types';
import './StatsPanel.css';

interface StatsPanelProps {
  markers: Marker[];
  totalDeps: number;
  totalMaintainers: number;
  locatedMaintainers: number;
}

export function StatsPanel({ markers, totalDeps, totalMaintainers, locatedMaintainers }: StatsPanelProps) {
  if (markers.length === 0) return null;

  // Count packages per location
  const locationCounts = new Map<string, number>();
  for (const marker of markers) {
    locationCounts.set(marker.location, (locationCounts.get(marker.location) ?? 0) + marker.packages.length);
  }

  // Sort by count descending
  const topLocations = Array.from(locationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCount = topLocations[0]?.[1] ?? 1;

  // Concentration risk
  const totalPackages = markers.reduce((sum, m) => sum + m.packages.length, 0);
  const topLocationPct = topLocations[0] ? Math.round((topLocations[0][1] / totalPackages) * 100) : 0;

  const coverageRate = totalMaintainers > 0
    ? Math.round((locatedMaintainers / totalMaintainers) * 100)
    : 0;

  return (
    <div className="stats-panel">
      <div className="stats-title">📊 Insights</div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalDeps}</div>
          <div className="stat-label">Dependencies</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{markers.length}</div>
          <div className="stat-label">Locations</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{coverageRate}%</div>
          <div className="stat-label">Coverage</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{topLocationPct}%</div>
          <div className="stat-label">Top Conc.</div>
        </div>
      </div>

      {topLocations.length > 0 && (
        <div className="top-locations">
          <div className="top-locations-title">Top Maintainer Locations</div>
          {topLocations.map(([location, count]) => (
            <div key={location} className="location-bar-row">
              <div className="location-name" title={location}>
                {location.length > 20 ? location.slice(0, 20) + '…' : location}
              </div>
              <div className="location-bar-container">
                <div
                  className="location-bar-fill"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <div className="location-count">{count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
