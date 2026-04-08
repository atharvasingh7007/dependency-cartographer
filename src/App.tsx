import { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBar } from './components/SearchBar';
import { MapView } from './components/MapView';
import { DependencyList } from './components/DependencyList';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ErrorBanner } from './components/ErrorBanner';
import { useDepTree } from './hooks/useDepTree';
import { useGeocode } from './hooks/useGeocode';
import { parseGitHubUser } from './lib/parseRepoUrl';
import type { Marker } from './types';
import './App.css';

const queryClient = new QueryClient();

function AppContent() {
  const [packageName, setPackageName] = useState<string | null>(null);
  const [depth, setDepth] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [phase, setPhase] = useState<'deps' | 'maintainers' | 'geocoding'>('deps');

  const { data: depTree, isLoading, error: depError } = useDepTree(packageName ?? '', depth);

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

  // Process each username to get location
  // GitHub usernames extracted — processed sequentially via useEffect
  const [processedUsers, setProcessedUsers] = useState<Map<string, { location?: string; avatarUrl?: string }>>(new Map());
  const [userIndex, setUserIndex] = useState(0);

  useEffect(() => {
    if (githubUsernames.length === 0 || !depTree) return;
    if (userIndex >= githubUsernames.length) return;

    setPhase('maintainers');
    const username = githubUsernames[userIndex];
    
    fetch(`/github-api/users/${encodeURIComponent(username)}`)
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

  const locationToGeocode = locationArray[locationIndex]?.[0];

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const geoResult = useGeocode(locationToGeocode ?? null);

  useEffect(() => {
    if (locationArray.length === 0) return;
    if (locationIndex >= locationArray.length) return;

    setPhase('geocoding');

    if (geoResult.data) {
      setGeocodeResults((prev) => new Map(prev).set(locationToGeocode!, geoResult.data!));
      setLocationIndex((i) => i + 1);
    } else if (geoResult.isFetchedAfterMount && !geoResult.isLoading) {
      // Geocode failed or not found, skip
      setLocationIndex((i) => i + 1);
    }
  }, [geoResult, locationToGeocode, locationIndex, locationArray.length]);

  // Build markers when geocoding is done
  useEffect(() => {
    if (locationIndex < locationArray.length) return;
    if (geocodeResults.size === 0) return;

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
    setPhase('deps');
  }, [locationIndex, locationArray, geocodeResults, depTree]);

  useEffect(() => {
    if (depError) {
      setError(depError.message || 'Failed to fetch dependency tree');
    }
  }, [depError]);

  function handleSearch(pkg: string, d: number) {
    setPackageName(pkg);
    setDepth(d);
    setError(null);
    setMarkers([]);
    setProcessedUsers(new Map());
    setGeocodeResults(new Map());
    setUserIndex(0);
    setLocationIndex(0);
  }

  const resolvedCount = geocodeResults.size;
  const unknownCount = (depTree?.length ?? 0) - resolvedCount;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">Dependency Cartographer</h1>
          <p className="app-subtitle">Where in the world is your code maintained?</p>
        </div>
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        {depTree && (
          <DependencyList
            deps={depTree}
            resolvedCount={resolvedCount}
            unknownCount={unknownCount}
          />
        )}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      </aside>
      <main className="main-content">
        {isLoading && (
          <LoadingOverlay
            phase={phase}
            found={resolvedCount}
            total={locationArray.length}
            packageName={packageName ?? ''}
          />
        )}
        <MapView markers={markers} />
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
