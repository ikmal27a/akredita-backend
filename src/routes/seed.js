// Routes: /seed - One-time seed endpoint (protected by SECRET key)
import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db/client.js';

const router = Router();

const CRITERIA = [
  { id: 'K1', title: 'Visi, Misi, Tujuan, dan Strategi', short: 'VMTS', totalRequired: 14, ownerRole: 'Tim Mutu', sortOrder: 1 },
  { id: 'K2', title: 'Tata Pamong, Tata Kelola, dan Kerjasama', short: 'Tata Pamong', totalRequired: 25, ownerRole: 'Wakil Dekan I', sortOrder: 2 },
  { id: 'K3', title: 'Mahasiswa', short: 'Mahasiswa', totalRequired: 23, ownerRole: 'Bag. Kemahasiswaan', sortOrder: 3 },
  { id: 'K4', title: 'Sumber Daya Manusia', short: 'SDM', totalRequired: 37, ownerRole: 'Bag. Kepegawaian', sortOrder: 4 },
  { id: 'K5', title: 'Keuangan, Sarana, dan Prasarana', short: 'Sarpras', totalRequired: 32, ownerRole: 'Bag. Umum', sortOrder: 5 },
  { id: 'K6', title: 'Pendidikan', short: 'Pendidikan', totalRequired: 59, ownerRole: 'Kaprodi', sortOrder: 6 },
  { id: 'K7', title: 'Penelitian', short: 'Penelitian', totalRequired: 35, ownerRole: 'LPPM', sortOrder: 7 },
  { id: 'K8', title: 'Pengabdian kepada Masyarakat', short: 'PkM', totalRequired: 25, ownerRole: 'LPPM', sortOrder: 8 },
  { id: 'K9', title: 'Luaran dan Capaian Tridharma', short: 'Luaran', totalRequired: 26, ownerRole: 'Kaprodi', sortOrder: 9 },
];

router.post('/', async (req, res, next) => {
  try {
    // Protect with secret
    const secret = req.query.secret || req.body.secret;
    if (secret !== process.env.SEED_SECRET) {
      return res.status(401).json({ error: 'Invalid seed secret' });
    }

    // Seed criteria
    for (const c of CRITERIA) {
      await prisma.criterion.upsert({
        where: { id: c.id },
        create: c, update: c,
      });
    }

    // Seed program
    const program = await prisma.program.upsert({
      where: { id: 'default-program' },
      create: {
        id: 'default-program',
        name: 'Sistem Informasi',
        faculty: 'Fakultas Bisnis Teknologi dan Sosial',
        level: 'Sarjana (S1)',
        university: 'Universitas Almarisah Madani',
        reviewer: 'LAM Infokom',
      },
      update: {},
    });

    // Seed admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@akredita.test' },
      create: {
        email: 'admin@akredita.test',
        passwordHash,
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        programId: program.id,
      },
      update: {},
    });

    res.json({
      ok: true,
      message: 'Seed selesai',
      criteria: CRITERIA.length,
      program: program.name,
      admin: {
        email: admin.email,
        password: 'admin123',
        note: 'GANTI password ini setelah login pertama!'
      },
    });
  } catch (e) { next(e); }
});

export default router;
