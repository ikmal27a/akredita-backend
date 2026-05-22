// Routes: /reviews
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db/client.js';

const router = Router();

// GET /reviews — antrian saya
router.get('/', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { reviewerId: req.user.sub, status: { in: ['IN_REVIEW', 'CHANGES_REQUESTED'] } },
      include: { document: { include: { criterion: true, uploader: true } }, comments: true },
      orderBy: { submittedAt: 'desc' },
    });
    res.json(reviews);
  } catch (e) { next(e); }
});

// POST /reviews/:id/approve
router.post('/:id/approve', async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review || review.reviewerId !== req.user.sub) return res.status(403).json({ error: 'Bukan reviewer Anda' });
    await prisma.$transaction([
      prisma.review.update({
        where: { id: review.id },
        data: { status: 'APPROVED', resolvedAt: new Date() },
      }),
      prisma.document.update({
        where: { id: review.documentId },
        data: { status: 'VERIFIED' },
      }),
      prisma.activity.create({
        data: {
          programId: req.user.programId,
          userId: req.user.sub,
          type: 'APPROVE',
          description: 'menyetujui',
          target: review.documentId,
        },
      }),
    ]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /reviews/:id/changes — request changes with note
router.post('/:id/changes', async (req, res, next) => {
  try {
    const note = z.string().min(1).parse(req.body.note);
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review || review.reviewerId !== req.user.sub) return res.status(403).json({ error: 'Bukan reviewer Anda' });
    await prisma.$transaction([
      prisma.review.update({
        where: { id: review.id },
        data: { status: 'CHANGES_REQUESTED', notesCount: { increment: 1 } },
      }),
      prisma.document.update({
        where: { id: review.documentId },
        data: { status: 'CHANGES' },
      }),
      prisma.comment.create({
        data: {
          reviewId: review.id,
          authorId: req.user.sub,
          type: 'CHANGE_REQUEST',
          body: note,
        },
      }),
      prisma.activity.create({
        data: {
          programId: req.user.programId,
          userId: req.user.sub,
          type: 'REQUEST_CHANGES',
          description: 'meminta revisi',
          target: review.documentId,
        },
      }),
    ]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /reviews/:id/comments
router.post('/:id/comments', async (req, res, next) => {
  try {
    const { body, quote, type = 'NOTE' } = req.body;
    if (!body) return res.status(400).json({ error: 'Body diperlukan' });
    const comment = await prisma.comment.create({
      data: {
        reviewId: req.params.id,
        authorId: req.user.sub,
        type, body, quote,
      },
    });
    await prisma.review.update({
      where: { id: req.params.id },
      data: { notesCount: { increment: 1 } },
    });
    res.status(201).json(comment);
  } catch (e) { next(e); }
});

export default router;
