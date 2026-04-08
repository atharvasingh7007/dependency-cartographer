// npm registry
export const NPM_REGISTRY_BASE = '/npm-api';

// GitHub API
export const GITHUB_API_BASE = '/github-api';

// Nominatim geocoding
export const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

// Rate limits
export const NOMINATIM_RATE_LIMIT_MS = 1000; // 1 req/sec
export const GITHUB_CONCURRENT_LIMIT = 10; // parallel requests

// Cache TTLs (ms)
export const GITHUB_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week
export const GEO_CACHE_TTL = Infinity; // permanent

// Default depth
export const DEFAULT_DEPTH = 2;

// Concurrent GitHub fetch limit
export const GITHUB_BATCH_SIZE = 10;
