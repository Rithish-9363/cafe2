import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { seedInitialCatalog } from './src/server/db.ts';
import { createApiRouter } from './src/server/routes.ts';

async function startServer() {
  seedInitialCatalog();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '3mb' }));
  app.use('/api', createApiRouter());

  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(distDir, 'index.html'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Brew & Bliss server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Brew & Bliss server:', err);
  process.exit(1);
});
