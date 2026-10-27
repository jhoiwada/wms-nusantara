// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import CustomerReturnsListPage from '../page';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockReturnsListResponse = {
  data: [
    {
      returnNo: 'RET-2026-0001',
      refId: 'do-1',
      warehouse: {
        id: 'wh-1',
        code: 'WH-JKT',
        name: 'Gudang Utama Jakarta',
      },
      createdAt: new Date().toISOString(),
      user: {
        id: 'usr-1',
        name: 'Staff Gudang',
        role: 'STAFF',
      },
      notes: '[RETUR CUSTOMER - Barang Rusak] DO: DO-2026-0001 | Rusak kemasan',
      itemsCount: 1,
      totalUnits: 10,
      sampleProducts: ['Indomie Goreng'],
    },
  ],
  meta: {
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  },
};

describe('CustomerReturnsListPage Component (T3.6)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockReturnsListResponse,
      }),
    );
  });

  it('merender judul halaman dan daftar dokumen retur customer', async () => {
    render(<CustomerReturnsListPage />);

    expect(screen.getByText('Retur Penjualan (Customer Returns)')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('RET-2026-0001')).toBeDefined();
    });

    expect(screen.getByText('Gudang Utama Jakarta')).toBeDefined();
    expect(screen.getByText('Indomie Goreng')).toBeDefined();
    expect(screen.getByText('+10 unit')).toBeDefined();
    expect(screen.getByText('Buat Retur Customer')).toBeDefined();
  });
});
