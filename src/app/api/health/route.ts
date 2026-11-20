import { checkDatabaseHealth } from '@/server/services/health.service';

export async function GET() {
  const startTime = Date.now();
  try {
    // Verifikasi konektivitas ke basis data PostgreSQL terpusat via service
    await checkDatabaseHealth();
    const responseTimeMs = Date.now() - startTime;

    return Response.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        latencyMs: responseTimeMs,
        uptimeSeconds: Math.floor(process.uptime()),
        service: 'PT Nusantara Logistik Distribusi WMS',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Database ping failed',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  }
}
