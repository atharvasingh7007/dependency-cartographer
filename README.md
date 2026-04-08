# 🗺️ Dependency Cartographer

> Enter an npm package name → see where all its dependencies' maintainers are located on a world map.

**"Where in the world is my code actually maintained?"**

![Preview](https://via.placeholder.com/800x400/09090b/10b981?text=Dependency+Cartographer)

## ⚡ What It Does

1. Enter any npm package name (e.g. `react`, `express`, `lodash`)
2. Fetches the full dependency tree (up to depth 3)
3. Extracts GitHub profiles of all maintainers
4. Geocodes their locations onto a world map
5. Shows you exactly where in the world your dependencies are maintained

## ✨ Features

- **Interactive World Map** — Pan, zoom, click pins for details
- **Depth Selector** — Explore dep tree at depth 1, 2, or 3
- **Real-time Progress** — See pins appear as they geocode
- **Persistent Cache** — IndexedDB caches geocoded locations forever
- **Emergency Detection** — Highlights clusters of maintainers in high-risk regions
- **Responsive Design** — Works on desktop and tablet

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Map | react-simple-maps + d3-geo |
| State | @tanstack/react-query |
| Cache | IndexedDB (idb-keyval) |
| Geocoding | Nominatim OpenStreetMap |
| Deployment | Vercel |

## 🚀 Running Locally

```bash
# Clone the repo
git clone https://github.com/atharvasingh7007/dependency-cartographer.git
cd dependency-cartographer

# Install dependencies
npm install

# Add your GitHub token (optional — for higher API rate limits)
cp .env.example .env
# Then set VITE_GITHUB_TOKEN=your_github_token_in_.env

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_GITHUB_TOKEN` | No | GitHub PAT for higher API rate limits (60 → 5000 req/hr). Works without it too. |

## 📦 API Rate Limits

| Service | Without Token | With Token |
|---|---|---|
| npm Registry | 300 req/min | Same |
| GitHub API | 60 req/hr | 5,000 req/hr |
| Nominatim | 1 req/sec (hard) | Same — cached results skip this |

## 🧭 Depth Reference

| Depth | Typical Deps | Load Time | Use Case |
|---|---|---|---|
| 1 | ~20-50 | ~5 sec | Quick look |
| 2 | ~200-500 | ~1-3 min | Recommended |
| 3 | ~1,000-3,000 | ~5-10 min | Deep analysis |

## 📁 Project Structure

```
src/
├── types/index.ts          # TypeScript interfaces
├── config/constants.ts     # API URLs, constants
├── data/geography.ts       # Map projection config
├── lib/
│   ├── fetchDepTree.ts    # Recursive npm dep fetcher
│   ├── parseRepoUrl.ts    # GitHub username extractor
│   ├── geocodeQueue.ts    # Nominatim rate-limit queue
│   └── db.ts             # IndexedDB wrapper
├── hooks/
│   ├── useDepTree.ts      # React Query: dep tree
│   ├── useGitHubUsers.ts  # React Query: GitHub profiles
│   ├── useGeocode.ts      # React Query: geocoding
│   └── useGeoCache.ts     # IndexedDB cache
└── components/
    ├── SearchBar.tsx       # Package name input
    ├── MapView.tsx        # World map + pins
    ├── DependencyList.tsx # Dep tree sidebar
    ├── LoadingOverlay.tsx  # Progress UI
    └── ErrorBanner.tsx    # Error display
```

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT — use it freely.

## 👨‍💻 Developed By

**Atharva Singh** — B.Tech CSE, LPU | Co-founder Bhooyam | AI/IoT Developer

*Built as a portfolio project demonstrating React, D3.js geo visualizations, and full-stack data pipeline design.*
