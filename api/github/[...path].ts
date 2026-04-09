// Vercel Serverless Function — GitHub API Proxy
// This file runs on Vercel's Node.js runtime, NOT in the browser.
// It keeps the GitHub token server-side (never exposed to the client).

interface VercelRequest {
  query: Record<string, string | string[]>;
  body: any;
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string | number) => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract the path segments after /api/github/
  const { path } = req.query;
  const segments = Array.isArray(path) ? path : [path];
  const githubPath = segments.filter(Boolean).join('/');

  const githubUrl = `https://api.github.com/${githubPath}`;

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DependencyCartographer/1.0',
  };

  // Inject GitHub token from server-side env (never exposed to client)
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(githubUrl, { headers });
    const data = await response.json();

    // Forward rate limit headers to client for visibility
    const rateLimitHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ];
    for (const header of rateLimitHeaders) {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ error: 'Failed to proxy request to GitHub API' });
  }
}
