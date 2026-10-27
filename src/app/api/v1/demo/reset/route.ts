import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError, AppError } from '@/server/errors';
import { resetDemoDatabase } from '@/server/services/demo-reset.service';

/**
 * Endpoint reset database demo (POST /api/v1/demo/reset).
 * Dapat dipicu secara manual oleh Admin melalui UI/cURL,
 * atau secara berkala oleh Cron Job terjadwal dengan token otentikasi.
 *
 * Header yang didukung:
 * - x-demo-reset-token: <token>
 * - Authorization: Bearer <token>
 * - Atau sesi login aktif dengan Role: ADMIN
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validasi proteksi lingkungan produksi
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_RESET !== 'true') {
      throw new AppError(
        'FORBIDDEN',
        'Fasilitas reset demo dinonaktifkan pada lingkungan produksi',
      );
    }

    // 2. Cek token otentikasi terjadwal (Cron / API token)
    const cronSecret =
      process.env.CRON_SECRET || process.env.DEMO_RESET_TOKEN || 'wms-demo-secret-token';
    const authHeader = req.headers.get('authorization');
    const tokenHeader = req.headers.get('x-demo-reset-token');

    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const providedToken = tokenHeader || bearerToken;

    if (providedToken) {
      if (providedToken !== cronSecret) {
        throw new AppError('UNAUTHENTICATED', 'Token otentikasi reset demo tidak valid');
      }
    } else {
      // Jika tanpa token, wajib memiliki sesi login aktif dengan Role ADMIN
      await requireRole(['ADMIN']);
    }

    // 3. Jalankan reset database atomik
    const result = await resetDemoDatabase();

    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}
