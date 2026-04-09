import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBar } from './components/SearchBar';
import { MapView } from './components/MapView';
import { DependencyList } from './components/DependencyList';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ErrorBanner } from './components/ErrorBanner';
import { StatsPanel } from './components/StatsPanel';
import { RiskBadge } from './components/RiskBadge';
import { EmptyState } from './components/EmptyState';
import { ExportButton } from './components/ExportButton';
import { HistoryPanel } from './components/HistoryPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { useDependencyPipeline } from './hooks/useDependencyPipeline';
import { useGeocode } from './hooks/useGeocode';
import './App.css';

const queryClient = new QueryClient();

type SidebarTab = 'search' | 'deps' | 'insights';

function AppContent() {
  const [state, actions] = useDependencyPipeline();
  const [activeTab, setActiveTab] = useState<SidebarTab>('search');
  const [depFilter, setDepFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pkg = params.get('pkg');
    const depth = parseInt(params.get('depth') ?? '2', 10);
    if (pkg) {
      actions.handleSearch(pkg, [1, 2, 3].includes(depth) ? depth : 2);
    }
  }, []);

  // Auto-switch to deps tab when results arrive
  useEffect(() => {
    if (state.phase === 'done' && state.depTree) {
      setActiveTab('deps');
    }
  }, [state.phase, state.depTree]);

  // Geocode hook — must be at top level
  const geoResult = useGeocode(state.locationToGeocode);

  useEffect(() => {
    actions.handleGeoResult(geoResult.data, geoResult.isLoading, geoResult.isFetchedAfterMount ?? false);
  }, [geoResult.data, geoResult.isLoading, geoResult.isFetchedAfterMount]);

  // Filtered deps
  const filteredDeps = (state.depTree ?? []).filter(dep => {
    if (depFilter && !dep.name.toLowerCase().includes(depFilter.toLowerCase())) return false;
    if (statusFilter !== 'all' && dep.status !== statusFilter) return false;
    return true;
  });

  const handleQuickSearch = useCallback((pkg: string, depth: number) => {
    actions.handleSearch(pkg, depth);
    setActiveTab('search');
  }, [actions]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="header-row">
            <div>
              <h1 className="app-title">Dependency Cartographer</h1>
              <p className="app-subtitle">Where in the world is your code maintained?</p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Search
          </button>
          <button
            className={`tab-btn ${activeTab === 'deps' ? 'active' : ''}`}
            onClick={() => setActiveTab('deps')}
          >
            📦 Deps {state.depTree ? `(${state.depTree.length})` : ''}
          </button>
          <button
            className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            📊 Insights
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'search' && (
            <div className="tab-panel">
              <SearchBar onSearch={(pkg, d) => { actions.handleSearch(pkg, d); }} isLoading={state.isProcessing} />
              <HistoryPanel onSelect={handleQuickSearch} />
              {state.rateLimitWarning && (
                <div className="rate-limit-warning">⚠️ {state.rateLimitWarning}</div>
              )}
            </div>
          )}

          {activeTab === 'deps' && (
            <div className="tab-panel">
              {state.depTree ? (
                <>
                  {/* Search & Filter */}
                  <div className="dep-filters">
                    <input
                      type="text"
                      placeholder="Filter dependencies..."
                      value={depFilter}
                      onChange={(e) => setDepFilter(e.target.value)}
                      className="dep-filter-input"
                    />
                    <div className="status-pills">
                      {['all', 'resolved', 'failed'].map(s => (
                        <button
                          key={s}
                          className={`status-pill ${statusFilter === s ? 'active' : ''}`}
                          onClick={() => setStatusFilter(s)}
                        >
                          {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <DependencyList
                    deps={filteredDeps}
                    resolvedCount={state.markers.length}
                    unknownCount={(state.depTree?.length ?? 0) - state.markers.length}
                    onSelect={(dep) => actions.setSelectedDep(dep.name === state.selectedDep ? null : dep.name)}
                  />
                </>
              ) : (
                <div className="tab-empty">Search for a package to see its dependencies</div>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="tab-panel">
              <RiskBadge markers={state.markers} />
              <StatsPanel
                markers={state.markers}
                totalDeps={state.depTree?.length ?? 0}
                totalMaintainers={state.totalMaintainers}
                locatedMaintainers={state.locatedMaintainers}
              />
              {state.markers.length > 0 && (
                <ExportButton
                  markers={state.markers}
                  depTree={state.depTree ?? []}
                  packageName={new URLSearchParams(window.location.search).get('pkg') ?? ''}
                />
              )}
            </div>
          )}
        </div>

        {state.error && <ErrorBanner message={state.error} onDismiss={actions.dismissError} />}
      </aside>

      <main className="main-content">
        {state.isProcessing && (
          <LoadingOverlay
            phase={state.phase as 'deps' | 'maintainers' | 'geocoding'}
            found={state.phase === 'maintainers' ? state.maintainerProgress.current : state.geocodeProgress.current}
            total={state.phase === 'maintainers' ? state.maintainerProgress.total : state.geocodeProgress.total}
            packageName={new URLSearchParams(window.location.search).get('pkg') ?? ''}
            onCancel={actions.cancelSearch}
          />
        )}
        {state.phase === 'idle' && !state.depTree ? (
          <EmptyState onQuickSearch={handleQuickSearch} />
        ) : (
          <MapView markers={state.markers} selectedDep={state.selectedDep} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
