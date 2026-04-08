import { useQuery } from '@tanstack/react-query';
import { getCachedCoords, setCachedCoords } from '../lib/db';
import { enqueueGeocode } from '../lib/geocodeQueue';
import { GEO_CACHE_TTL } from '../config/constants';

export function useGeoCache(location: string | null) {
  return useQuery({
    queryKey: ['geocode', location],
    queryFn: async () => {
      if (!location) return null;

      const cached = await getCachedCoords(location);
      if (cached) return cached;

      const coords = await enqueueGeocode(location);
      if (coords) {
        await setCachedCoords(location, coords);
      }
      return coords;
    },
    enabled: !!location,
    staleTime: Infinity,
    gcTime: GEO_CACHE_TTL,
  });
}
