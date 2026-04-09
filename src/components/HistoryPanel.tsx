import { useState, useEffect } from 'react';
import { getSearchHistory } from '../hooks/useDependencyPipeline';
import './HistoryPanel.css';

interface HistoryPanelProps {
  onSelect: (pkg: string, depth: number) => void;
}

export function HistoryPanel({ onSelect }: HistoryPanelProps) {
  const [history, setHistory] = useState<{ pkg: string; depth: number; timestamp: number }[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  if (history.length === 0) return null;

  const shown = expanded ? history : history.slice(0, 3);

  return (
    <div className="history-panel">
      <div className="history-header" onClick={() => setExpanded(!expanded)}>
        <span className="history-title">🕐 Recent Searches</span>
        <span className="history-chevron">{expanded ? '▲' : '▼'}</span>
      </div>
      <div className="history-list">
        {shown.map((entry, i) => (
          <button
            key={`${entry.pkg}-${entry.depth}-${i}`}
            className="history-item"
            onClick={() => onSelect(entry.pkg, entry.depth)}
          >
            <span className="history-pkg">{entry.pkg}</span>
            <span className="history-depth">d{entry.depth}</span>
          </button>
        ))}
      </div>
      {history.length > 3 && !expanded && (
        <button className="history-show-more" onClick={() => setExpanded(true)}>
          +{history.length - 3} more
        </button>
      )}
    </div>
  );
}
