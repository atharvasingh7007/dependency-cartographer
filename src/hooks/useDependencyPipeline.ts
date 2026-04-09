import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDepTree } from './useDepTree';
import { useGeocode } from './useGeocode';
import { parseGitHubUser } from '../lib/parseRepoUrl';
import { getCachedGitHubProfile, setCachedGitHubProfile } from '../lib/db';
import { GITHUB_API_BASE, GITHUB_BATCH_SIZE } from '../config/constants';
import type { Marker, DepNode } from '../types';

export type PipelinePhase = 'idle' | 'deps' | 'maintainers' | 'geocoding' | 'done';

export interface PipelineState {
  depTree: DepNode[] | undefined;
  markers: Marker[];
  phase: PipelinePhase;
  error: string | null;
  selectedDep: string | null;
  isProcessing: boolean;

  // Progress
  maintainerProgress: { current: number; total: number };
  geocodeProgress: { current: number; total: number };
  rateLimitWarning: string | null;

  // Maintainer data
  locatedMaintainers: number;
  totalMaintainers: number;

  // Geocode internals (for useGeocode hook)
  locationToGeocode: string | null;
  locationArray: [string, string[]][];
  geocodeResults: Map<string, [number, number]>;
}

export interface PipelineActions {
  handleSearch: (pkg: string, d: number) => void;
  setSelectedDep: (dep: string | null) => void;
  dismissError: () => void;
  cancelSearch: () => void;
  handleGeoResult: (data: [number, number] | null | undefined, isLoading: boolean, isFetched: boolean) => void;
}

export function useDependencyPipeline(): [PipelineState, PipelineActions] {
  const [packageName, setPackageName] = useState<string | null>(null);
  const [depth, setDepth] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [selectedDep, setSelectedDep] = useState<string | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const { data: depTree, isLoading: isDepLoading, error: depError } = useDepTree(packageName ?? '', depth);

  // --- Phase 2: GitHub Profile Fetching (Parallel Batched) ---
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

  const [processedUsers, setProcessedUsers] = useState<Map<string, { location?: string; avatarUrl?: string }>>(new Map());
  const [maintainersDone, setMaintainersDone] = useState(false);

  useEffect(() => {
    if (!depTree || githubUsernames.length === 0 || phase !== 'deps') return;
    if (isDepLoading) return;

    setPhase('maintainers');
    setMaintainersDone(false);

    let cancelled = false;

    async function fetchAllProfiles() {
      const results = new Map<string, { location?: string; avatarUrl?: string }>();

      // Process in batches of GITHUB_BATCH_SIZE
      for (let i = 0; i < githubUsernames.length; i += GITHUB_BATCH_SIZE) {
        if (cancelled) return;

        const batch = githubUsernames.slice(i, i + GITHUB_BATCH_SIZE);

        const promises = batch.map(async (username) => {
          // Check IndexedDB cache first
          const cached = await getCachedGitHubProfile(username);
          if (cached) {
            return { username, location: cached.location, avatarUrl: cached.avatarUrl };
          }

          try {
            const res = await fetch(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`);

            // Rate limit detection
            const remaining = res.headers.get('x-ratelimit-remaining');
            if (remaining && parseInt(remaining) < 10) {
              setRateLimitWarning(`GitHub rate limit low: ${remaining} requests remaining`);
            }

            if (!res.ok) {
              if (res.status === 403 || res.status === 429) {
                setRateLimitWarning('GitHub rate limit reached — results may be incomplete');
              }
              return { username, location: undefined, avatarUrl: undefined };
            }

            const data = await res.json();
            const profile = { location: data?.location, avatarUrl: data?.avatar_url };

            // Cache in IndexedDB
            await setCachedGitHubProfile(username, profile);

            return { username, ...profile };
          } catch {
            return { username, location: undefined, avatarUrl: undefined };
          }
        });

        const batchResults = await Promise.allSettled(promises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.set(result.value.username, {
              location: result.value.location,
              avatarUrl: result.value.avatarUrl,
            });
          }
        }

        // Update progress incrementally
        if (!cancelled) {
          setProcessedUsers(new Map(results));
        }
      }

      if (!cancelled) {
        setProcessedUsers(new Map(results));
        setMaintainersDone(true);
      }
    }

    fetchAllProfiles();

    return () => { cancelled = true; };
  }, [depTree, githubUsernames, phase, isDepLoading]);

  // --- Phase 3: Geocoding ---
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

  const [geocodeResults, setGeocodeResults] = useState<Map<string, [number, number]>>(new Map());
  const [locationIndex, setLocationIndex] = useState(0);
  const locationArray = useMemo(() => Array.from(uniqueLocations.entries()), [uniqueLocations]);

  const locationToGeocode = locationArray[locationIndex]?.[0] ?? null;

  // Transition to geocoding phase when maintainers done
  useEffect(() => {
    if (maintainersDone && phase === 'maintainers') {
      if (locationArray.length === 0) {
        setPhase('done');
      } else {
        setPhase('geocoding');
      }
    }
  }, [maintainersDone, phase, locationArray.length]);

  // Handle geocode result callback
  const handleGeoResult = useCallback((data: [number, number] | null | undefined, isLoading: boolean, isFetched: boolean) => {
    if (phase !== 'geocoding') return;
    if (locationIndex >= locationArray.length) return;

    if (data) {
      setGeocodeResults((prev) => new Map(prev).set(locationToGeocode!, data));
      setLocationIndex((i) => i + 1);
    } else if (isFetched && !isLoading) {
      setLocationIndex((i) => i + 1);
    }
  }, [phase, locationIndex, locationArray.length, locationToGeocode]);

  // Build markers when geocoding is done
  useEffect(() => {
    if (phase !== 'geocoding' && phase !== 'done') return;
    if (locationIndex < locationArray.length && phase === 'geocoding') return;

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
    if (locationIndex >= locationArray.length && locationArray.length > 0) {
      setPhase('done');
    } else if (phase === 'geocoding' && locationArray.length === 0) {
      setPhase('done');
    }
  }, [locationIndex, locationArray, geocodeResults, depTree, phase]);

  // Dep tree completed → trigger maintainer phase
  useEffect(() => {
    if (depTree && !isDepLoading && phase === 'deps') {
      if (githubUsernames.length === 0) {
        setPhase('done');
      }
      // maintainer useEffect will pick up phase === 'deps' → 'maintainers'
    }
  }, [depTree, isDepLoading, phase, githubUsernames.length]);

  // Error handling
  useEffect(() => {
    if (depError) {
      setError(depError.message || 'Failed to fetch dependency tree');
      setPhase('idle');
    }
  }, [depError]);

  // --- Actions ---
  const handleSearch = useCallback((pkg: string, d: number) => {
    // Cancel previous
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setPackageName(pkg);
    setDepth(d);
    setError(null);
    setMarkers([]);
    setProcessedUsers(new Map());
    setGeocodeResults(new Map());
    setLocationIndex(0);
    setMaintainersDone(false);
    setPhase('deps');
    setSelectedDep(null);
    setRateLimitWarning(null);

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('pkg', pkg);
    url.searchParams.set('depth', String(d));
    window.history.replaceState({}, '', url.toString());

    // Save to history
    saveToHistory(pkg, d);
  }, []);

  const cancelSearch = useCallback(() => {
    abortRef.current?.abort();
    setPhase('done');
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  // --- Computed ---
  const isProcessing = phase === 'deps' || phase === 'maintainers' || phase === 'geocoding';
  const locatedMaintainers = Array.from(processedUsers.values()).filter(u => u.location).length;
  const totalMaintainers = processedUsers.size;

  const state: PipelineState = {
    depTree,
    markers,
    phase,
    error,
    selectedDep,
    isProcessing,
    maintainerProgress: { current: processedUsers.size, total: githubUsernames.length },
    geocodeProgress: { current: locationIndex, total: locationArray.length },
    rateLimitWarning,
    locatedMaintainers,
    totalMaintainers,
    locationToGeocode,
    locationArray,
    geocodeResults,
  };

  const actions: PipelineActions = {
    handleSearch,
    setSelectedDep,
    dismissError,
    cancelSearch,
    handleGeoResult,
  };

  return [state, actions];
}

// --- Search History ---

interface HistoryEntry {
  pkg: string;
  depth: number;
  timestamp: number;
}

export function saveToHistory(pkg: string, depth: number) {
  try {
    const raw = localStorage.getItem('dc_history');
    const history: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    // Remove duplicate
    const filtered = history.filter(h => !(h.pkg === pkg && h.depth === depth));
    filtered.unshift({ pkg, depth, timestamp: Date.now() });
    // Keep last 20
    localStorage.setItem('dc_history', JSON.stringify(filtered.slice(0, 20)));
  } catch {}
}

export function getSearchHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem('dc_history');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
