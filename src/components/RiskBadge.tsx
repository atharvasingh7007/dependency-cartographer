import type { Marker } from '../types';
import './RiskBadge.css';

interface RiskBadgeProps {
  markers: Marker[];
}

type RiskLevel = 'low' | 'medium' | 'high';

function calculateRisk(markers: Marker[]): { level: RiskLevel; message: string; details: string } {
  if (markers.length === 0) {
    return { level: 'low', message: 'No data', details: 'Search for a package to assess risk' };
  }

  const totalPackages = markers.reduce((sum, m) => sum + m.packages.length, 0);

  // Count packages per location
  const locationCounts = new Map<string, number>();
  for (const marker of markers) {
    locationCounts.set(marker.location, marker.packages.length);
  }

  const maxInOneLocation = Math.max(...locationCounts.values());
  const concentrationPct = Math.round((maxInOneLocation / totalPackages) * 100);
  const uniqueLocations = markers.length;

  if (concentrationPct > 60 || uniqueLocations <= 2) {
    return {
      level: 'high',
      message: 'High Concentration Risk',
      details: `${concentrationPct}% of packages maintained in one region. ${uniqueLocations} unique location${uniqueLocations !== 1 ? 's' : ''}.`,
    };
  }

  if (concentrationPct > 35 || uniqueLocations <= 4) {
    return {
      level: 'medium',
      message: 'Moderate Concentration',
      details: `${concentrationPct}% in top region across ${uniqueLocations} locations. Consider diversification.`,
    };
  }

  return {
    level: 'low',
    message: 'Well Distributed',
    details: `${uniqueLocations} unique locations. Top region has ${concentrationPct}% of packages.`,
  };
}

export function RiskBadge({ markers }: RiskBadgeProps) {
  if (markers.length === 0) return null;

  const risk = calculateRisk(markers);

  return (
    <div className={`risk-badge risk-${risk.level}`}>
      <div className="risk-header">
        <span className="risk-icon">
          {risk.level === 'high' ? '🔴' : risk.level === 'medium' ? '🟡' : '🟢'}
        </span>
        <span className="risk-title">{risk.message}</span>
      </div>
      <div className="risk-details">{risk.details}</div>
    </div>
  );
}
