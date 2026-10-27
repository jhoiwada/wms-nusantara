import { resetDemoDatabase } from '../src/server/services/demo-reset.service';
import { prisma } from '../src/server/db';

async function main() {
  console.log('🌱 Memulai seeding database WMS...');
  const start = Date.now();

  const result = await resetDemoDatabase();

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`✨ ${result.message} (${duration}s)`);
  console.log('📊 Ringkasan Dataset Demo:');
  console.table(result.counts);
}

main()
  .catch((e) => {
    console.error('❌ Gagal seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
