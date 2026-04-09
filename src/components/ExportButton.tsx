import type { Marker, DepNode } from '../types';
import './ExportButton.css';

interface ExportButtonProps {
  markers: Marker[];
  depTree: DepNode[];
  packageName: string;
}

export function ExportButton({ markers, depTree, packageName }: ExportButtonProps) {
  function exportJSON() {
    const data = {
      package: packageName,
      timestamp: new Date().toISOString(),
      summary: {
        totalDependencies: depTree.length,
        locatedMaintainers: markers.length,
        locations: markers.map(m => m.location),
      },
      markers: markers.map(m => ({
        location: m.location,
        coordinates: m.coordinates,
        maintainer: m.maintainer,
        packages: m.packages,
      })),
      dependencies: depTree.map(d => ({
        name: d.name,
        version: d.version,
        status: d.status,
        repository: d.repository,
      })),
    };

    downloadFile(
      JSON.stringify(data, null, 2),
      `dependency-cartographer-${packageName}.json`,
      'application/json'
    );
  }

  function exportCSV() {
    const headers = ['Location', 'Latitude', 'Longitude', 'Maintainer', 'Packages'];
    const rows = markers.map(m => [
      `"${m.location}"`,
      m.coordinates[1],
      m.coordinates[0],
      m.maintainer,
      `"${m.packages.join(', ')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `dependency-cartographer-${packageName}.csv`, 'text/csv');
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="export-section">
      <div className="export-title">📥 Export Results</div>
      <div className="export-buttons">
        <button className="export-btn" onClick={exportJSON}>
          JSON
        </button>
        <button className="export-btn" onClick={exportCSV}>
          CSV
        </button>
      </div>
    </div>
  );
}
