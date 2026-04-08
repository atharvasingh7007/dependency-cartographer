import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { useState } from 'react';
import { GEO_URL } from '../data/geography';
import type { Marker as MarkerType } from '../types';
import './MapView.css';

interface MapViewProps {
  markers: MarkerType[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
}

export function MapView({ markers }: MapViewProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
  });

  function handleMarkerMouseEnter(
    e: React.MouseEvent,
    marker: MarkerType
  ) {
    const rect = (e.currentTarget as SVGElement)
      .closest('svg')
      ?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      content: `${marker.maintainer}\n${marker.packages.slice(0, 5).join(', ')}${marker.packages.length > 5 ? '\n+' + (marker.packages.length - 5) + ' more' : ''}`,
    });
  }

  function handleMarkerMouseLeave() {
    setTooltip((t) => ({ ...t, visible: false }));
  }

  return (
    <div className="map-container">
      <ComposableMap
        projection="geoNaturalEarth1"
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={8}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: { fill: '#27272a', stroke: '#3f3f46', strokeWidth: 0.5 },
                    hover: { fill: '#3f3f46', stroke: '#3f3f46', strokeWidth: 0.5 },
                    pressed: { fill: '#3f3f46', stroke: '#3f3f46', strokeWidth: 0.5 },
                  }}
                />
              ))
            }
          </Geographies>

          {markers.map((marker) => (
            <Marker
              key={marker.id}
              coordinates={marker.coordinates}
              onMouseEnter={(e) => handleMarkerMouseEnter(e, marker)}
              onMouseLeave={handleMarkerMouseLeave}
            >
              <circle
                r={5}
                fill="#10b981"
                stroke="#064e3b"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
              />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {tooltip.visible && (
        <div
          className="map-tooltip"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.content.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
