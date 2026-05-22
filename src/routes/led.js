// Routes: /led — get/save LED narrative drafts
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db/client.js';

const router = Router();

// GET /led — semua draft untuk program user
router.get('/', async (req, res, next) => {
  try {
    const drafts = await prisma.ledDraft.findMany({
      where: { programId: req.user.programId },
    });
    const map = Object.fromEntries(
      drafts.map(d => [`${d.criterionId}.${d.subIndex}`, d.content])
    );
    res.json(map);
  } catch (e) { next(e); }
});

// GET /led/:criterionId/:subIndex
router.get('/:criterionId/:subIndex', async (req, res, next) => {
  try {
    const draft = await prisma.ledDraft.findUnique({
      where: {
        programId_criterionId_subIndex: {
          programId: req.user.programId,
          criterionId: req.params.criterionId,
          subIndex: parseInt(req.params.subIndex),
        },
      },
    });
    res.json({ content: draft?.content || '' });
  } catch (e) { next(e); }
});

// PUT /led/:criterionId/:subIndex
router.put('/:criterionId/:subIndex', async (req, res, next) => {
  try {
    const content = z.string().parse(req.body.content);
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const subIndex = parseInt(req.params.subIndex);
    const draft = await prisma.ledDraft.upsert({
      where: {
        programId_criterionId_subIndex: {
          programId: req.user.programId,
          criterionId: req.params.criterionId,
          subIndex,
        },
      },
      create: {
        programId: req.user.programId,
        criterionId: req.params.criterionId,
        subIndex,
        content,
        wordCount,
        lastEditorId: req.user.sub,
      },
      update: { content, wordCount, lastEditorId: req.user.sub },
    });
    res.json(draft);
  } catch (e) { next(e); }
});

export default router;
