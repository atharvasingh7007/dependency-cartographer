import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const githubToken = process.env.VITE_GITHUB_TOKEN || '';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'github-token-injector',
      configureServer(server) {
        server.middlewares.use('/github-api/', (req, res, next) => {
          if (githubToken) {
            req.headers['authorization'] = `Bearer ${githubToken}`;
          }
          next();
        });
      },
    },
  ],
  server: {
    proxy: {
      '/npm-api': {
        target: 'https://registry.npmjs.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/npm-api/, ''),
      },
      '/github-api': {
        target: 'https://api.github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-api/, ''),
      },
    },
  },
})
