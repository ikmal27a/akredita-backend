// Routes: /criteria — return 9 kriteria + live progress
import { Router } from 'express';
import prisma from '../db/client.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const criteria = await prisma.criterion.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const docs = await prisma.document.findMany({
      where: { programId: req.user.programId },
      select: { criterionId: true, status: true },
    });
    const result = criteria.map(c => {
      const myDocs = docs.filter(d => d.criterionId === c.id);
      const verified = myDocs.filter(d => d.status === 'VERIFIED').length;
      const progress = c.totalRequired > 0 ? Math.min(1, verified / c.totalRequired) : 0;
      let status = 'progress';
      if (progress >= 1) status = 'submitted';
      else if (progress >= 0.85) status = 'review';
      else if (myDocs.length === 0) status = 'empty';
      return {
        ...c,
        docs: myDocs.length,
        progress,
        status,
      };
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/:id/documents', async (req, res, next) => {
  try {
    const docs = await prisma.document.findMany({
      where: { programId: req.user.programId, criterionId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(docs);
  } catch (e) { next(e); }
});

export default router;
