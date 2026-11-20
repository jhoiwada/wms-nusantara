import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { checkDatabaseHealth } from '@/server/services/health.service';

vi.mock('@/server/services/health.service', () => ({
  checkDatabaseHealth: vi.fn(),
}));

describe('Health Check API (/api/health)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mengembalikan status 200 dan status healthy saat database terhubung', async () => {
    vi.mocked(checkDatabaseHealth).mockResolvedValueOnce(true);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('healthy');
    expect(json.database).toBe('connected');
    expect(json.service).toContain('Nusantara Logistik');
  });

  it('mengembalikan status 503 saat database gagal merespon ping', async () => {
    vi.mocked(checkDatabaseHealth).mockRejectedValueOnce(new Error('Connection refused'));

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.status).toBe('unhealthy');
    expect(json.database).toBe('disconnected');
    expect(json.error).toBe('Connection refused');
  });
});
