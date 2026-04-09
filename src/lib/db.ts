import { get, set, keys, clear } from 'idb-keyval';

// --- Geocode Cache ---

export async function getCachedCoords(
  location: string
): Promise<[number, number] | null> {
  const key = `geo:${location.toLowerCase().trim()}`;
  const cached = await get(key);
  return cached ?? null;
}

export async function setCachedCoords(
  location: string,
  coords: [number, number]
): Promise<void> {
  const key = `geo:${location.toLowerCase().trim()}`;
  await set(key, coords);
}

// --- GitHub Profile Cache ---

interface CachedGitHubProfile {
  location?: string;
  avatarUrl?: string;
  timestamp: number;
}

const GITHUB_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

export async function getCachedGitHubProfile(
  username: string
): Promise<CachedGitHubProfile | null> {
  const key = `gh:${username.toLowerCase()}`;
  const cached = await get<CachedGitHubProfile>(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > GITHUB_CACHE_TTL) return null;
  return cached;
}

export async function setCachedGitHubProfile(
  username: string,
  profile: { location?: string; avatarUrl?: string }
): Promise<void> {
  const key = `gh:${username.toLowerCase()}`;
  await set(key, { ...profile, timestamp: Date.now() });
}

// --- Dep Tree Cache ---

interface CachedDepTree {
  data: any[];
  timestamp: number;
}

const DEP_TREE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getCachedDepTree(
  packageName: string,
  depth: number
): Promise<any[] | null> {
  const key = `deps:${packageName}@${depth}`;
  const cached = await get<CachedDepTree>(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > DEP_TREE_CACHE_TTL) return null;
  return cached.data;
}

export async function setCachedDepTree(
  packageName: string,
  depth: number,
  data: any[]
): Promise<void> {
  const key = `deps:${packageName}@${depth}`;
  await set(key, { data, timestamp: Date.now() });
}

// --- Cache Stats ---

export async function getCacheStats(): Promise<{ total: number }> {
  const allKeys = await keys();
  return { total: allKeys.length };
}

export async function clearAllCaches(): Promise<void> {
  await clear();
}
