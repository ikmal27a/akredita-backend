// Routes: /ai — AI assistant endpoints (proxy ke Anthropic/OpenAI)
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

async function callAnthropic(prompt) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY belum diset');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Anthropic error');
  return data.content[0].text;
}

const SYSTEM_PROMPT = `Kamu adalah Akredita AI, asisten akreditasi perguruan tinggi Indonesia. Bantu menyusun LED (Laporan Evaluasi Diri), memeriksa kelengkapan dokumen sesuai standar BAN-PT / LAM, dan menganalisis data akreditasi. Gunakan bahasa Indonesia formal.`;

// POST /ai/chat — general chat
router.post('/chat', async (req, res, next) => {
  try {
    const { message } = z.object({ message: z.string().min(1) }).parse(req.body);
    const response = await callAnthropic(`${SYSTEM_PROMPT}\n\nPertanyaan: ${message}`);
    res.json({ response });
  } catch (e) { next(e); }
});

// POST /ai/draft-led — generate LED narrative
router.post('/draft-led', async (req, res, next) => {
  try {
    const { criterionId, subIndex, context } = req.body;
    const prompt = `${SYSTEM_PROMPT}\n\nSusun draft narasi LED untuk kriteria ${criterionId}.${subIndex}. Konteks: ${context || ''}. Tulis 2-3 paragraf bahasa Indonesia formal.`;
    const response = await callAnthropic(prompt);
    res.json({ content: response });
  } catch (e) { next(e); }
});

// POST /ai/verify-completeness — periksa kelengkapan
router.post('/verify-completeness', async (req, res, next) => {
  try {
    const { criterionId, documentList } = req.body;
    const prompt = `${SYSTEM_PROMPT}\n\nPeriksa kelengkapan kriteria ${criterionId}. Daftar dokumen yang sudah ada: ${JSON.stringify(documentList)}. Identifikasi dokumen wajib yang belum lengkap dan beri saran.`;
    const response = await callAnthropic(prompt);
    res.json({ analysis: response });
  } catch (e) { next(e); }
});

export default router;
