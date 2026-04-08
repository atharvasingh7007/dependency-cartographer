import './LoadingOverlay.css';

interface LoadingOverlayProps {
  phase: 'deps' | 'maintainers' | 'geocoding';
  found: number;
  total: number;
  packageName: string;
  onCancel?: () => void;
}

const phaseLabels = {
  deps: 'Fetching dependencies...',
  maintainers: 'Extracting maintainers...',
  geocoding: 'Geocoding locations...',
};

export function LoadingOverlay({
  phase,
  found,
  total,
  packageName,
  onCancel,
}: LoadingOverlayProps) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner" />
        <div className="loading-text">{phaseLabels[phase]}</div>
        {phase === 'geocoding' && (
          <div className="loading-progress">
            {found} / {total} locations found
          </div>
        )}
        <div className="loading-subtext">
          Exploring the world behind <strong>{packageName}</strong>
        </div>
        {onCancel && (
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
