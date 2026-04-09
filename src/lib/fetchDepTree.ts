import { NPM_REGISTRY_BASE } from '../config/constants';
import { getCachedDepTree, setCachedDepTree } from './db';
import type { DepNode } from '../types';

interface NpmLatest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  repository?: { url: string };
  maintainers?: { name: string }[];
}

interface NpmPackument {
  name: string;
  'dist-tags': { latest: string };
  versions: Record<string, NpmLatest>;
}

export async function fetchDepTree(
  packageName: string,
  depth: number = 2,
  signal?: AbortSignal
): Promise<DepNode[]> {
  // Check IndexedDB cache first
  const cached = await getCachedDepTree(packageName, depth);
  if (cached) return cached as DepNode[];

  const visited = new Set<string>();
  const result: DepNode[] = [];

  async function fetchRecursive(
    name: string,
    currentDepth: number
  ): Promise<void> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (currentDepth < 0 || visited.has(name)) return;
    visited.add(name);

    const node: DepNode = {
      name,
      version: 'unknown',
      maintainers: [],
      githubUsers: [],
      status: 'fetching',
    };

    try {
      // Fetch abbreviated packument for smaller payload
      const res = await fetch(
        `${NPM_REGISTRY_BASE}/${encodeURIComponent(name)}`,
        {
          signal,
          headers: { 'Accept': 'application/vnd.npm.install-v1+json' },
        }
      );
      if (!res.ok) {
        node.status = 'failed';
        result.push(node);
        return;
      }

      const packument = await res.json();
      const latestVersion = packument['dist-tags']?.latest;

      if (!latestVersion) {
        node.status = 'failed';
        result.push(node);
        return;
      }

      const versionData = packument.versions?.[latestVersion];
      if (!versionData) {
        node.status = 'failed';
        result.push(node);
        return;
      }

      node.version = versionData.version || latestVersion;
      node.repository = versionData.repository?.url;
      node.maintainers = versionData.maintainers?.map((m: any) => m.name) ?? [];
      node.status = 'resolved';

      result.push(node);

      // Only walk production dependencies
      const deps = versionData.dependencies ?? {};
      const subPromises = Object.keys(deps).map((depName) =>
        fetchRecursive(depName, currentDepth - 1)
      );
      await Promise.all(subPromises);
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      node.status = 'failed';
      result.push(node);
    }
  }

  await fetchRecursive(packageName, depth);

  // Cache the result
  await setCachedDepTree(packageName, depth, result);

  return result;
}
