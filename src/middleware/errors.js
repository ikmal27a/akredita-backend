export function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  if (err.code === 'P2025') return res.status(404).json({ error: 'Data tidak ditemukan' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'Data sudah ada' });
  if (err.name === 'ZodError') return res.status(400).json({ error: 'Validasi gagal', details: err.errors });
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
}
