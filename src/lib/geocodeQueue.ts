import { NOMINATIM_BASE, NOMINATIM_RATE_LIMIT_MS } from '../config/constants';

interface QueueItem {
  location: string;
  resolve: (coords: [number, number] | null) => void;
}

let queue: QueueItem[] = [];
let processing = false;
let lastRequestTime = 0;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < NOMINATIM_RATE_LIMIT_MS) {
      await sleep(NOMINATIM_RATE_LIMIT_MS - elapsed);
    }

    const item = queue.shift()!;
    lastRequestTime = Date.now();

    try {
      const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(item.location)}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'DependencyCartographer/1.0' },
      });
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        item.resolve([lon, lat]);
      } else {
        item.resolve(null);
      }
    } catch {
      item.resolve(null);
    }
  }

  processing = false;
}

export function enqueueGeocode(
  location: string
): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    queue.push({ location, resolve });
    if (!processing) {
      processQueue();
    }
  });
}
