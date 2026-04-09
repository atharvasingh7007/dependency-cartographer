import { useQuery } from '@tanstack/react-query';
import { fetchDepTree } from '../lib/fetchDepTree';

export function useDepTree(packageName: string | null, depth: number) {
  return useQuery({
    queryKey: ['dep-tree', packageName, depth],
    queryFn: () => fetchDepTree(packageName!, depth),
    enabled: !!packageName,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
