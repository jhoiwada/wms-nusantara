import { resetDemoDatabase } from '../src/server/services/demo-reset.service';
import { prisma } from '../src/server/db';

async function main() {
  console.log('🔄 Memulai proses reset database demo WMS...');
  const start = Date.now();

  const result = await resetDemoDatabase();

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`✅ ${result.message} (${duration}s)`);
  console.log('📊 Ringkasan Data Demo yang Dibuat:');
  console.table(result.counts);
}

main()
  .catch((err) => {
    console.error('❌ Gagal mereset database demo:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
