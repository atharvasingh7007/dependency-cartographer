import { useGeoCache } from './useGeoCache';

export function useGeocode(location: string | null) {
  return useGeoCache(location);
}
