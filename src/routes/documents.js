// Routes: GET/POST/DELETE /documents
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import prisma from '../db/client.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
await fs.mkdir(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^\w.\-]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.xlsx', '.xls', '.zip'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Tipe file tidak didukung'));
  },
});

// GET /documents — list, filter by criterion/status
router.get('/', async (req, res, next) => {
  try {
    const where = { programId: req.user.programId };
    if (req.query.criterion) where.criterionId = req.query.criterion;
    if (req.query.status) where.status = req.query.status.toUpperCase();
    const docs = await prisma.document.findMany({
      where,
      include: { uploader: { select: { fullName: true } }, criterion: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(docs);
  } catch (e) { next(e); }
});

// POST /documents — upload
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File diperlukan' });
    const schema = z.object({
      criterionId: z.string(),
      name: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
    const fileType = ['pdf'].includes(ext) ? 'pdf' :
                     ['xls','xlsx'].includes(ext) ? 'xls' :
                     ['zip'].includes(ext) ? 'zip' : 'doc';

    const doc = await prisma.document.create({
      data: {
        name: data.name || req.file.originalname,
        filePath: req.file.filename,
        fileType, fileSize: req.file.size,
        criterionId: data.criterionId,
        programId: req.user.programId,
        uploaderId: req.user.sub,
      },
    });

    // Auto-create review queue entry
    // Pick the first reviewer in the program (or assign to specific reviewer based on rules)
    const reviewer = await prisma.user.findFirst({
      where: { programId: req.user.programId, role: 'REVIEWER' },
    });
    if (reviewer) {
      await prisma.review.create({
        data: {
          documentId: doc.id,
          reviewerId: reviewer.id,
        },
      });
    }

    // Activity
    await prisma.activity.create({
      data: {
        programId: req.user.programId,
        userId: req.user.sub,
        type: 'UPLOAD',
        description: 'mengunggah',
        target: doc.name,
      },
    });

    res.status(201).json(doc);
  } catch (e) { next(e); }
});

// GET /documents/:id
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, programId: req.user.programId },
      include: { uploader: true, reviews: { include: { comments: true } } },
    });
    if (!doc) return res.status(404).json({ error: 'Tidak ditemukan' });
    res.json(doc);
  } catch (e) { next(e); }
});

// GET /documents/:id/file — download file
router.get('/:id/file', async (req, res, next) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, programId: req.user.programId },
    });
    if (!doc) return res.status(404).json({ error: 'Tidak ditemukan' });
    const filepath = path.join(UPLOAD_DIR, doc.filePath);
    res.download(filepath, doc.name);
  } catch (e) { next(e); }
});

// DELETE /documents/:id
router.delete('/:id', requireRole('SUPER_ADMIN', 'KOORDINATOR'), async (req, res, next) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, programId: req.user.programId },
    });
    if (!doc) return res.status(404).json({ error: 'Tidak ditemukan' });
    await fs.unlink(path.join(UPLOAD_DIR, doc.filePath)).catch(() => {});
    await prisma.document.delete({ where: { id: doc.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
