
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';

import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { soundDir, videoDir } from './middleware/upload.mjs';

import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import { questions, categories } from './routes/questions.js';
import arenaRoutes from './routes/arena.js';
import publicRoutes from './routes/public.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Behind Vercel / Render / reverse proxies
  if (config.isProd || process.env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    })
  );

  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      time: Date.now(),
    });
  });

  // Authentication routes
  app.use('/api/auth', authRoutes);

  // Public routes
  app.use('/api/public', publicRoutes);

  // Protected routes
  app.use('/api/teams', requireAuth, teamRoutes);
  app.use('/api/questions', requireAuth, questions);
  app.use('/api/categories', requireAuth, categories);
  app.use('/api', requireAuth, arenaRoutes);

  // API 404 handler
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: 'Not found.',
    });
  });

  // Upload directories
  // These must match the directories used by Multer.
  const uploadRoot = path.dirname(videoDir);

  // Serve uploaded audio and videos
  app.use(
    '/uploads',
    express.static(uploadRoot, {
      maxAge: '1h',
      fallthrough: false,
    })
  );

  // Production frontend serving
  const clientIndex = path.join(config.clientDist, 'index.html');

  if (fs.existsSync(clientIndex)) {
    app.use(
      express.static(config.clientDist, {
        maxAge: '1h',
        index: false,
      })
    );

    app.get('*', (_req, res) => {
      res.sendFile(clientIndex);
    });
  } else if (config.isProd) {
    console.warn(
      `[setup] Client build not found at ${config.clientDist}. ` +
      'Build command must be: npm run render-build'
    );

    app.get('*', (_req, res) => {
      res
        .status(503)
        .type('html')
        .send(
          '<!doctype html><meta charset="utf-8"><title>Arena not built</title>' +
          '<body style="font-family:system-ui;background:#100C0D;color:#E3DCD2;padding:40px;line-height:1.6">' +
          '<h2 style="color:#CC8B65">The server is running, but the website was not built.</h2>' +
          '<p>Set the Render <b>Build Command</b> to <code>npm run render-build</code> and the <b>Start Command</b> to <code>npm start</code>, then redeploy.</p>' +
          '<p>API status: <a style="color:#6FBF9C" href="/api/health">/api/health</a></p>' +
          '</body>'
        );
    });
  }

  // Global error handler
  app.use(errorHandler);

  return app;
}
