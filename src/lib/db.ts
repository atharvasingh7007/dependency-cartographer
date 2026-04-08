import { get, set } from 'idb-keyval';

export async function getCachedCoords(
  location: string
): Promise<[number, number] | null> {
  const key = location.toLowerCase().trim();
  const cached = await get(key);
  return cached ?? null;
}

export async function setCachedCoords(
  location: string,
  coords: [number, number]
): Promise<void> {
  const key = location.toLowerCase().trim();
  await set(key, coords);
}
