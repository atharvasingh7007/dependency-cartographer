import { useState, useEffect, useMemo, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBar } from './components/SearchBar';
import { MapView } from './components/MapView';
import { DependencyList } from './components/DependencyList';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ErrorBanner } from './components/ErrorBanner';
import { StatsPanel } from './components/StatsPanel';
import { RiskBadge } from './components/RiskBadge';
import { EmptyState } from './components/EmptyState';
import { useDepTree } from './hooks/useDepTree';
import { useGeocode } from './hooks/useGeocode';
import { parseGitHubUser } from './lib/parseRepoUrl';
import { GITHUB_API_BASE } from './config/constants';
import type { Marker } from './types';
import './App.css';

const queryClient = new QueryClient();

/** Read URL search params for shareable state */
function getUrlParams(): { pkg: string | null; depth: number } {
  const params = new URLSearchParams(window.location.search);
  const pkg = params.get('pkg');
  const depth = parseInt(params.get('depth') ?? '2', 10);
  return { pkg, depth: [1, 2, 3].includes(depth) ? depth : 2 };
}

/** Update URL without reload */
function setUrlParams(pkg: string, depth: number) {
  const url = new URL(window.location.href);
  url.searchParams.set('pkg', pkg);
  url.searchParams.set('depth', String(depth));
  window.history.replaceState({}, '', url.toString());
}

function AppContent() {
  const urlParams = getUrlParams();

  const [packageName, setPackageName] = useState<string | null>(urlParams.pkg);
  const [depth, setDepth] = useState(urlParams.depth);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [phase, setPhase] = useState<'idle' | 'deps' | 'maintainers' | 'geocoding' | 'done'>(
    urlParams.pkg ? 'deps' : 'idle'
  );
  const [selectedDep, setSelectedDep] = useState<string | null>(null);

  const { data: depTree, isLoading: isDepLoading, error: depError } = useDepTree(packageName ?? '', depth);

  // Extract unique GitHub usernames from dep tree
  const githubUsernames = useMemo(() => {
    if (!depTree) return [];
    const usernames = new Set<string>();
    for (const dep of depTree) {
      if (dep.repository) {
        const user = parseGitHubUser(dep.repository);
        if (user) usernames.add(user);
      }
    }
    return Array.from(usernames);
  }, [depTree]);

  // Process each username to get location — sequential via useEffect
  const [processedUsers, setProcessedUsers] = useState<Map<string, { location?: string; avatarUrl?: string }>>(new Map());
  const [userIndex, setUserIndex] = useState(0);

  useEffect(() => {
    if (githubUsernames.length === 0 || !depTree) return;
    if (userIndex >= githubUsernames.length) return;

    setPhase('maintainers');
    const username = githubUsernames[userIndex];

    fetch(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.location) {
          setProcessedUsers((prev) => new Map(prev).set(username, { location: data.location, avatarUrl: data.avatar_url }));
        } else {
          setProcessedUsers((prev) => new Map(prev).set(username, {}));
        }
        setUserIndex((i) => i + 1);
      })
      .catch(() => {
        setProcessedUsers((prev) => new Map(prev).set(username, {}));
        setUserIndex((i) => i + 1);
      });
  }, [githubUsernames, depTree, userIndex]);

  // Extract unique locations
  const uniqueLocations = useMemo(() => {
    const locs = new Map<string, string[]>();
    for (const [username, data] of processedUsers) {
      if (data.location) {
        const existing = locs.get(data.location) ?? [];
        existing.push(username);
        locs.set(data.location, existing);
      }
    }
    return locs;
  }, [processedUsers]);

  // Geocode locations
  const [geocodeResults, setGeocodeResults] = useState<Map<string, [number, number]>>(new Map());
  const [locationIndex, setLocationIndex] = useState(0);
  const locationArray = useMemo(() => Array.from(uniqueLocations.entries()), [uniqueLocations]);

  const locationToGeocode = locationArray[locationIndex]?.[0] ?? null;

  const geoResult = useGeocode(locationToGeocode);

  useEffect(() => {
    if (locationArray.length === 0) return;
    if (locationIndex >= locationArray.length) return;

    setPhase('geocoding');

    if (geoResult.data) {
      setGeocodeResults((prev) => new Map(prev).set(locationToGeocode!, geoResult.data!));
      setLocationIndex((i) => i + 1);
    } else if (geoResult.isFetchedAfterMount && !geoResult.isLoading) {
      setLocationIndex((i) => i + 1);
    }
  }, [geoResult, locationToGeocode, locationIndex, locationArray.length]);

  // Build markers when geocoding is done
  useEffect(() => {
    if (locationArray.length === 0 && phase === 'geocoding') {
      setPhase('done');
      return;
    }
    if (locationIndex < locationArray.length) return;
    if (geocodeResults.size === 0 && phase !== 'geocoding') return;

    const newMarkers: Marker[] = [];
    for (const [location, usernames] of locationArray) {
      const coords = geocodeResults.get(location);
      if (coords) {
        const packages: string[] = [];
        for (const dep of depTree ?? []) {
          for (const username of usernames) {
            if (dep.repository?.includes(username)) {
              packages.push(dep.name);
            }
          }
        }
        if (packages.length > 0) {
          newMarkers.push({
            id: location,
            coordinates: coords,
            location,
            packages: [...new Set(packages)],
            maintainer: usernames[0],
          });
        }
      }
    }
    setMarkers(newMarkers);
    if (phase === 'geocoding') {
      setPhase('done');
    }
  }, [locationIndex, locationArray, geocodeResults, depTree, phase]);

  // Handle dep tree complete
  useEffect(() => {
    if (depTree && !isDepLoading && phase === 'deps') {
      if (githubUsernames.length === 0) {
        setPhase('done');
      }
    }
  }, [depTree, isDepLoading, phase, githubUsernames.length]);

  // Handle all maintainers processed
  useEffect(() => {
    if (
      phase === 'maintainers' &&
      githubUsernames.length > 0 &&
      userIndex >= githubUsernames.length
    ) {
      if (locationArray.length === 0) {
        setPhase('done');
      }
    }
  }, [phase, githubUsernames.length, userIndex, locationArray.length]);

  useEffect(() => {
    if (depError) {
      setError(depError.message || 'Failed to fetch dependency tree');
      setPhase('idle');
    }
  }, [depError]);

  const handleSearch = useCallback((pkg: string, d: number) => {
    setPackageName(pkg);
    setDepth(d);
    setError(null);
    setMarkers([]);
    setProcessedUsers(new Map());
    setGeocodeResults(new Map());
    setUserIndex(0);
    setLocationIndex(0);
    setPhase('deps');
    setSelectedDep(null);
    setUrlParams(pkg, d);
  }, []);

  const isProcessing = phase === 'deps' || phase === 'maintainers' || phase === 'geocoding';

  const locatedMaintainers = Array.from(processedUsers.values()).filter(u => u.location).length;
  const totalMaintainers = processedUsers.size;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">Dependency Cartographer</h1>
          <p className="app-subtitle">Where in the world is your code maintained?</p>
        </div>
        <SearchBar onSearch={handleSearch} isLoading={isProcessing} />

        <RiskBadge markers={markers} />

        {depTree && (
          <DependencyList
            deps={depTree}
            resolvedCount={markers.length}
            unknownCount={depTree.length - markers.length}
            onSelect={(dep) => setSelectedDep(dep.name === selectedDep ? null : dep.name)}
          />
        )}

        <StatsPanel
          markers={markers}
          totalDeps={depTree?.length ?? 0}
          totalMaintainers={totalMaintainers}
          locatedMaintainers={locatedMaintainers}
        />

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      </aside>
      <main className="main-content">
        {isProcessing && (
          <LoadingOverlay
            phase={phase as 'deps' | 'maintainers' | 'geocoding'}
            found={phase === 'maintainers' ? userIndex : geocodeResults.size}
            total={phase === 'maintainers' ? githubUsernames.length : locationArray.length}
            packageName={packageName ?? ''}
          />
        )}
        {phase === 'idle' && !depTree ? (
          <EmptyState onQuickSearch={handleSearch} />
        ) : (
          <MapView markers={markers} selectedDep={selectedDep} />
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
