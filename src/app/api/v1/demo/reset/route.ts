import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError, AppError } from '@/server/errors';
import { resetDemoDatabase } from '@/server/services/demo-reset.service';
import { checkDemoResetCooldown, recordDemoReset } from '@/server/services/demo-cooldown';

/**
 * Cek status cooldown pemulihan data (GET /api/v1/demo/reset).
 * Digunakan oleh UI Admin untuk menampilkan timer dan status kesiapan pemulihan.
 */
export async function GET() {
  try {
    await requireRole(['ADMIN']);
    const status = checkDemoResetCooldown();
    return Response.json({ data: status });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Endpoint reset & pemulihan database demo (POST /api/v1/demo/reset).
 * Dapat dipicu secara manual oleh Admin melalui UI,
 * atau secara berkala oleh Cron Job terjadwal dengan token otentikasi resmi.
 *
 * Header yang didukung:
 * - Authorization: Bearer <CRON_SECRET> (Vercel Cron / External Cron)
 * - x-demo-reset-token: <CRON_SECRET>
 * - Atau sesi login aktif dengan Role: ADMIN (Dibatasi cooldown 15 menit)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Cek token otentikasi terjadwal (Cron / API token)
    const cronSecret =
      process.env.CRON_SECRET ||
      process.env.DEMO_RESET_TOKEN ||
      (process.env.NODE_ENV !== 'production' ? 'wms-dev-cron-secret' : undefined);

    const authHeader = req.headers.get('authorization');
    const tokenHeader = req.headers.get('x-demo-reset-token');

    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const providedToken = tokenHeader || bearerToken;

    let isCronTrigger = false;

    if (providedToken) {
      if (!cronSecret || providedToken !== cronSecret) {
        throw new AppError(
          'UNAUTHENTICATED',
          'Token otentikasi reset demo tidak valid atau belum dikonfigurasi',
        );
      }
      isCronTrigger = true;
    } else {
      // Jika tanpa token, wajib memiliki sesi login aktif dengan Role ADMIN
      await requireRole(['ADMIN']);

      // Evaluasi cooldown 15 menit untuk trigger manual pengguna
      const cooldown = checkDemoResetCooldown();
      if (!cooldown.allowed) {
        throw new AppError(
          'FORBIDDEN',
          `Pemulihan data manual dibatasi 1x per 15 menit untuk stabilitas server. Silakan coba lagi dalam ${cooldown.retryAfterSeconds} detik.`,
        );
      }
    }

    // 2. Jalankan reset database atomik
    const result = await resetDemoDatabase();

    // 3. Catat timestamp cooldown jika dipicu manual oleh admin
    if (!isCronTrigger) {
      recordDemoReset();
    }

    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}
