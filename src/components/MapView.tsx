import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { useState } from 'react';
import { GEO_URL, PROJECTION } from '../data/geography';
import type { Marker as MarkerType } from '../types';
import './MapView.css';

interface MapViewProps {
  markers: MarkerType[];
  selectedDep?: string | null;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  maintainer: string;
  packages: string[];
  location: string;
}

export function MapView({ markers, selectedDep }: MapViewProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, maintainer: '', packages: [], location: '',
  });

  function handleMarkerMouseEnter(e: React.MouseEvent, marker: MarkerType) {
    const rect = (e.currentTarget as SVGElement).closest('svg')?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      maintainer: marker.maintainer,
      packages: marker.packages,
      location: marker.location,
    });
  }

  function handleMarkerMouseLeave() {
    setTooltip((t) => ({ ...t, visible: false }));
  }

  function isHighlighted(marker: MarkerType): boolean {
    if (!selectedDep) return false;
    return marker.packages.includes(selectedDep);
  }

  function getMarkerRadius(marker: MarkerType): number {
    const count = marker.packages.length;
    if (count >= 20) return 10;
    if (count >= 10) return 8;
    if (count >= 5) return 6;
    return 4;
  }

  return (
    <div className="map-container">
      <ComposableMap projection={PROJECTION} style={{ width: '100%', height: '100%' }}>
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={8}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  className="map-geography"
                  style={{
                    default: { fill: 'var(--map-land)', stroke: 'var(--map-border)', strokeWidth: 0.5 },
                    hover: { fill: 'var(--map-land-hover)', stroke: 'var(--map-border)', strokeWidth: 0.5 },
                    pressed: { fill: 'var(--map-land-hover)', stroke: 'var(--map-border)', strokeWidth: 0.5 },
                  }}
                />
              ))
            }
          </Geographies>

          {markers.map((marker, index) => {
            const highlighted = isHighlighted(marker);
            const radius = getMarkerRadius(marker);
            return (
              <Marker
                key={marker.id}
                coordinates={marker.coordinates}
                onMouseEnter={(e) => handleMarkerMouseEnter(e, marker)}
                onMouseLeave={handleMarkerMouseLeave}
              >
                {/* Pulse ring */}
                <circle
                  r={radius + 4}
                  fill="none"
                  stroke={highlighted ? '#f59e0b' : '#10b981'}
                  strokeWidth={1}
                  opacity={0.3}
                  className="marker-pulse"
                />
                {/* Main dot with staggered entrance */}
                <circle
                  r={radius}
                  fill={highlighted ? '#f59e0b' : '#10b981'}
                  stroke={highlighted ? '#92400e' : '#064e3b'}
                  strokeWidth={1.5}
                  style={{
                    cursor: 'pointer',
                    animation: `markerPop 0.4s ease-out ${index * 0.05}s both`,
                  }}
                  className="marker-dot"
                />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {tooltip.visible && (
        <div className="map-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          <div className="tooltip-header">
            <span className="tooltip-maintainer">@{tooltip.maintainer}</span>
          </div>
          <div className="tooltip-location">📍 {tooltip.location}</div>
          <div className="tooltip-packages">
            {tooltip.packages.slice(0, 5).map((pkg, i) => (
              <span key={i} className="tooltip-pkg-chip">{pkg}</span>
            ))}
            {tooltip.packages.length > 5 && (
              <span className="tooltip-more">+{tooltip.packages.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {markers.length === 0 && (
        <div className="map-empty-hint">
          Search for an npm package to see its maintainers on the map
        </div>
      )}

      {markers.length > 0 && (
        <div className="map-marker-count">
          {markers.length} location{markers.length !== 1 ? 's' : ''} mapped
        </div>
      )}
    </div>
  );
}
