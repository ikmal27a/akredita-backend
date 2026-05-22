// Routes: /activity — activity feed
import { Router } from 'express';
import prisma from '../db/client.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const activity = await prisma.activity.findMany({
      where: { programId: req.user.programId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(req.query.limit) || 50,
    });
    res.json(activity);
  } catch (e) { next(e); }
});

export default router;
