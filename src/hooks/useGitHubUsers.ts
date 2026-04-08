import { useQuery } from '@tanstack/react-query';
import { GITHUB_API_BASE, GITHUB_CACHE_TTL } from '../config/constants';
import type { GitHubUser } from '../types';

export function useGitHubUser(username: string | null) {
  return useQuery({
    queryKey: ['github-user', username],
    queryFn: async (): Promise<GitHubUser | null> => {
      if (!username) return null;
      const res = await fetch(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!username,
    staleTime: GITHUB_CACHE_TTL,
    gcTime: GITHUB_CACHE_TTL,
  });
}
