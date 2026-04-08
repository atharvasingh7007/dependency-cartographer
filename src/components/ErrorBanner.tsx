import './ErrorBanner.css';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner">
      <span className="error-icon">⚠</span>
      <span className="error-message">{message}</span>
      <button className="dismiss-btn" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}
