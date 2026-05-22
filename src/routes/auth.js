// Routes: /auth/login, /auth/register
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../db/client.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Email atau password salah' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email atau password salah' });
    const token = jwt.sign(
      { sub: user.id, role: user.role, programId: user.programId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, programId: user.programId },
    });
  } catch (e) { next(e); }
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(['SUPER_ADMIN','KOORDINATOR','PIC_KRITERIA','REVIEWER','ASESOR','PIMPINAN']),
  programId: z.string().optional(),
});

router.post('/register', authMiddleware, requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { ...data, passwordHash, password: undefined },
    });
    res.status(201).json({ id: user.id, email: user.email });
  } catch (e) { next(e); }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, email: true, fullName: true, role: true, programId: true, program: true },
    });
    res.json(user);
  } catch (e) { next(e); }
});

export default router;
