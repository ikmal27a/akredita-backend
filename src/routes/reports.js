// Routes: /reports — generate PDF/Excel/ZIP exports
import { Router } from 'express';
import prisma from '../db/client.js';

const router = Router();

// GET /reports/led — LED dalam format text/CSV ringkas
router.get('/led', async (req, res, next) => {
  try {
    const drafts = await prisma.ledDraft.findMany({
      where: { programId: req.user.programId },
      include: { criterion: true },
      orderBy: [{ criterionId: 'asc' }, { subIndex: 'asc' }],
    });
    const lines = [
      'AKREDITA — LAPORAN EVALUASI DIRI (LED)',
      '='.repeat(60),
      `Program: ${req.user.programId}`,
      `Tanggal: ${new Date().toLocaleDateString('id-ID')}`,
      '',
    ];
    for (const d of drafts) {
      lines.push(`\n## ${d.criterionId}.${d.subIndex} — ${d.criterion.title}`);
      lines.push(d.content || '(belum diisi)');
    }
    res.type('text/plain').send(lines.join('\n'));
  } catch (e) { next(e); }
});

// GET /reports/documents.csv — daftar dokumen sebagai CSV
router.get('/documents.csv', async (req, res, next) => {
  try {
    const docs = await prisma.document.findMany({
      where: { programId: req.user.programId },
      include: { uploader: true, criterion: true },
    });
    const header = 'id,kriteria,nama,pengunggah,status,ukuran,tanggal\n';
    const body = docs.map(d =>
      `${d.id},${d.criterionId},"${d.name.replace(/"/g, '""')}",${d.uploader.fullName},${d.status},${d.fileSize},${d.createdAt.toISOString()}`
    ).join('\n');
    res.type('text/csv').attachment('dokumen.csv').send(header + body);
  } catch (e) { next(e); }
});

// GET /reports/summary — dashboard summary JSON
router.get('/summary', async (req, res, next) => {
  try {
    const [docCount, criteriaCount, reviewCount, ledCount] = await Promise.all([
      prisma.document.count({ where: { programId: req.user.programId } }),
      prisma.criterion.count(),
      prisma.review.count({ where: { document: { programId: req.user.programId }, status: { in: ['IN_REVIEW','CHANGES_REQUESTED'] } } }),
      prisma.ledDraft.count({ where: { programId: req.user.programId } }),
    ]);
    res.json({ documents: docCount, criteria: criteriaCount, pendingReviews: reviewCount, ledDrafts: ledCount });
  } catch (e) { next(e); }
});

export default router;
