# Backend Akredita — Node.js + Express + PostgreSQL

Skeleton backend siap-pakai untuk Akredita. Gunakan ini saat Anda butuh:
- Multi-user (banyak orang akses sistem yang sama)
- Penyimpanan terpusat (bukan per-browser)
- Otentikasi JWT
- API untuk mobile/aplikasi lain

> **Catatan:** Frontend Akredita yang ada di `dist/` saat ini menggunakan IndexedDB (database di browser). Backend ini OPTIONAL — hanya pasang jika Anda butuh multi-user.

## Stack
- **Node.js** 18+
- **Express** untuk REST API
- **PostgreSQL** 14+ untuk database
- **Prisma** sebagai ORM
- **JWT** untuk autentikasi
- **Multer** + **MinIO/S3** untuk file storage

## Instalasi

```bash
# 1. Install dependencies
npm install

# 2. Salin .env.example ke .env, isi DATABASE_URL
cp .env.example .env

# 3. Run migrasi database (buat tabel)
npx prisma migrate dev --name init

# 4. (opsional) Seed data awal
npx prisma db seed

# 5. Jalankan server
npm run dev    # development dengan hot-reload
npm start      # production
```

Server berjalan di `http://localhost:3001`

## Database schema

Lihat `prisma/schema.prisma` untuk skema lengkap. Tabel-tabel utama:

| Tabel | Deskripsi |
|---|---|
| `users` | Pengguna sistem (super admin, koordinator, reviewer, pic kriteria) |
| `programs` | Program studi (banyak prodi dalam 1 universitas) |
| `criteria` | 9 kriteria akreditasi (data referensi) |
| `documents` | Dokumen yang diunggah (path file, metadata, status) |
| `reviews` | Antrian review untuk setiap dokumen |
| `comments` | Diskusi pada review |
| `led_drafts` | Draft narasi LED per subkriteria |
| `activity_log` | Audit trail semua aksi |
| `deadlines` | Tenggat per kriteria |

## API endpoints

```
POST   /auth/login           — login, return JWT
POST   /auth/register        — daftar user (admin only)

GET    /documents            — list semua dokumen (filtered by program)
POST   /documents            — upload dokumen baru (multipart)
GET    /documents/:id        — detail dokumen + file
GET    /documents/:id/file   — download file
DELETE /documents/:id        — hapus dokumen

GET    /criteria             — 9 kriteria + progress live
GET    /criteria/:id/docs    — dokumen di kriteria ini

GET    /reviews              — antrian review user ini
POST   /reviews/:id/approve  — setujui dokumen
POST   /reviews/:id/changes  — minta revisi
POST   /reviews/:id/comments — tambah komentar

GET    /led/:key             — ambil draft LED
PUT    /led/:key             — simpan draft

GET    /activity             — feed aktivitas
GET    /deadlines            — tenggat mendatang

POST   /ai/draft-led         — minta AI menyusun LED (proxy ke Claude/OpenAI)
POST   /ai/verify-completeness — periksa kelengkapan dokumen

GET    /reports/led          — generate PDF LED
GET    /reports/borang3a     — generate PDF Borang 3A
GET    /reports/excel/:type  — generate Excel report
GET    /reports/bundle       — bundel asesmen ZIP
```

Semua endpoint kecuali `/auth/login` butuh header `Authorization: Bearer <token>`.

## Role-based access

| Role | Akses |
|---|---|
| `super_admin` | Semua, termasuk manajemen user dan konfigurasi |
| `koordinator` | Kelola dokumen + LED, kirim ke asesor |
| `pic_kriteria` | Upload + LED untuk kriteria yang dia pegang |
| `reviewer` | Approve/request changes |
| `asesor` | Read-only |
| `pimpinan` | Read-only dashboard + tanda tangan |

## Hubungkan frontend ke backend

Edit `dist/config.js` (atau ubah di `state.jsx`) untuk menggunakan API backend, bukan IndexedDB:

```js
// Frontend code
const API_URL = 'https://api.akredita.example.com';

async function fetchDocs() {
  const res = await fetch(`${API_URL}/documents`, {
    headers: { Authorization: `Bearer ${localStorage.token}` }
  });
  return res.json();
}
```

## Deploy backend

### Railway / Render (paling mudah)
1. Push folder `backend/` ke GitHub
2. Connect repo di Railway / Render
3. Set environment variable `DATABASE_URL` (PostgreSQL gratis disediakan)
4. Deploy otomatis pada push

### VPS sendiri
```bash
# Install Node + PostgreSQL
sudo apt install nodejs npm postgresql

# Clone & install
git clone <repo>
cd backend
npm install
npx prisma migrate deploy

# Jalankan dengan PM2 (auto-restart)
npm install -g pm2
pm2 start npm --name akredita-api -- start
pm2 save
pm2 startup
```

### Docker
```bash
docker compose up -d
```

(Lihat `docker-compose.yml` untuk konfigurasi lengkap)
