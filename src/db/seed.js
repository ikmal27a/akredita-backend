// Seed — buat data awal: 9 kriteria BAN-PT + 1 program + 1 super admin
import bcrypt from 'bcrypt';
import prisma from './client.js';

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

async function main() {
  console.log('Seeding criteria…');
  for (const c of CRITERIA) {
    await prisma.criterion.upsert({
      where: { id: c.id },
      create: c, update: c,
    });
  }

  console.log('Seeding program…');
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

  console.log('Seeding super admin…');
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
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

  console.log('\n✓ Seed selesai. Login dengan:');
  console.log('  Email:    admin@akredita.test');
  console.log('  Password: admin123');
  console.log('\n⚠️  GANTI password ini di production!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
