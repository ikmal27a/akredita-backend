// Entry point — Express server
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import seedRouter from './routes/seed.js';

import authRouter from './routes/auth.js';
import documentsRouter from './routes/documents.js';
import criteriaRouter from './routes/criteria.js';
import reviewsRouter from './routes/reviews.js';
import ledRouter from './routes/led.js';
import activityRouter from './routes/activity.js';
import aiRouter from './routes/ai.js';
import reportsRouter from './routes/reports.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (process.env.CORS_ORIGIN || '').split(',').filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,                   // requests per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Public routes
app.get('/', (req, res) => res.json({ ok: true, name: 'akredita-api', message: 'Server is running' }));
app.get('/health', (req, res) => res.json({ ok: true, name: 'akredita-api' }));
app.use('/auth', authRouter);

// Protected routes — require JWT
app.use('/documents',  authMiddleware, documentsRouter);
app.use('/criteria',   authMiddleware, criteriaRouter);
app.use('/reviews',    authMiddleware, reviewsRouter);
app.use('/led',        authMiddleware, ledRouter);
app.use('/activity',   authMiddleware, activityRouter);
app.use('/ai',         authMiddleware, aiRouter);
app.use('/reports',    authMiddleware, reportsRouter);
app.use('/seed', seedRouter);

// Static file serving for uploaded docs (gated by ?token=)
app.use('/files', authMiddleware, express.static(process.env.UPLOAD_DIR || './uploads'));

// Error handler — must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✓ Akredita API listening on http://localhost:${PORT}`);
});
