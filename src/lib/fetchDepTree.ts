import { NPM_REGISTRY_BASE } from '../config/constants';
import type { DepNode } from '../types';

interface NpmPackument {
  name: string;
  'dist-tags': { latest: string };
  versions: Record<
    string,
    {
      version: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      repository?: { url: string };
      maintainers?: { name: string }[];
    }
  >;
}

export async function fetchDepTree(
  packageName: string,
  depth: number = 2
): Promise<DepNode[]> {
  const visited = new Set<string>();
  const result: DepNode[] = [];

  async function fetchRecursive(
    name: string,
    currentDepth: number
  ): Promise<void> {
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
      const res = await fetch(`${NPM_REGISTRY_BASE}/${encodeURIComponent(name)}`);
      if (!res.ok) {
        node.status = 'failed';
        result.push(node);
        return;
      }

      const packument: NpmPackument = await res.json();
      const latestVersion = packument['dist-tags'].latest;
      const versionData = packument.versions[latestVersion];

      if (!versionData) {
        node.status = 'failed';
        result.push(node);
        return;
      }

      node.version = versionData.version;
      node.repository = versionData.repository?.url;
      node.maintainers = versionData.maintainers?.map((m) => m.name) ?? [];

      result.push(node);

      const deps = versionData.dependencies ?? {};
      const devDeps = versionData.devDependencies ?? {};
      const allDeps = { ...deps, ...devDeps };

      const subPromises = Object.keys(allDeps).map((depName) =>
        fetchRecursive(depName, currentDepth - 1)
      );
      await Promise.all(subPromises);
    } catch {
      node.status = 'failed';
      result.push(node);
    }
  }

  await fetchRecursive(packageName, depth);
  return result;
}
