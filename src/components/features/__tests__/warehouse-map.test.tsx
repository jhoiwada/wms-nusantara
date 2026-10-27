// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { WarehouseMap } from '@/components/features/warehouse-map';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockMapResponse = {
  data: {
    warehouse: {
      id: 'wh-1',
      code: 'WH-JKT',
      name: 'Gudang Utama Jakarta',
      address: 'Jl. Rawa Gelam No. 3',
      isActive: true,
    },
    availableWarehouses: [
      { id: 'wh-1', code: 'WH-JKT', name: 'Gudang Utama Jakarta' },
      { id: 'wh-2', code: 'WH-BKS', name: 'Gudang Bekasi' },
    ],
    summary: {
      totalLocations: 2,
      occupiedLocations: 1,
      emptyLocations: 1,
      frozenLocations: 0,
      totalUnits: 50,
      totalSkus: 1,
      occupancyRate: 50,
      expiringBatchesCount: 0,
      expiredBatchesCount: 0,
    },
    zones: [
      {
        zone: 'A',
        totalLocations: 2,
        occupiedLocations: 1,
        emptyLocations: 1,
        frozenLocations: 0,
        totalQuantity: 50,
        occupancyRate: 50,
      },
    ],
    locations: [
      {
        id: 'loc-1',
        warehouseId: 'wh-1',
        code: 'A-01-01',
        zone: 'A',
        rack: '01',
        level: '01',
        isFrozen: false,
        isActive: true,
        occupancyStatus: 'OCCUPIED',
        totalQuantity: 50,
        itemCount: 1,
        hasExpiringSoon: false,
        hasExpired: false,
        stocks: [
          {
            productId: 'prod-1',
            sku: 'SKU-INDOMIE',
            name: 'Indomie Goreng',
            categoryName: 'Makanan',
            batchNo: 'BATCH-001',
            expiryDate: '2026-12-31T00:00:00.000Z',
            quantity: 50,
            uom: 'DUS',
          },
        ],
      },
      {
        id: 'loc-2',
        warehouseId: 'wh-1',
        code: 'A-01-02',
        zone: 'A',
        rack: '01',
        level: '02',
        isFrozen: false,
        isActive: true,
        occupancyStatus: 'EMPTY',
        totalQuantity: 0,
        itemCount: 0,
        hasExpiringSoon: false,
        hasExpired: false,
        stocks: [],
      },
    ],
  },
};

describe('WarehouseMap Component (T3.5)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMapResponse,
      }),
    );
  });

  it('merender ringkasan gudang dan sel rak pada peta 2D', async () => {
    render(<WarehouseMap initialWarehouseId="wh-1" />);

    // Wait for warehouse name to load
    await waitFor(() => {
      expect(screen.getByText('Gudang Utama Jakarta')).toBeDefined();
    });

    // Check KPI metrics
    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByText('WH-JKT')).toBeDefined();
    expect(screen.getByText('Rak 01')).toBeDefined();
    expect(screen.getByText('A-01-01')).toBeDefined();
    expect(screen.getByText('A-01-02')).toBeDefined();
  });

  it('membuka panel inspektor ketika sel lokasi diklik', async () => {
    render(<WarehouseMap initialWarehouseId="wh-1" />);

    await waitFor(() => {
      expect(screen.getByText('A-01-01')).toBeDefined();
    });

    const rackCell = screen.getByTitle('Klik untuk detail lokasi A-01-01');
    expect(rackCell).toBeTruthy();
    fireEvent.click(rackCell);

    // Inspector should open showing stock details
    await waitFor(() => {
      expect(screen.getByText('Daftar Barang di Rak Ini:')).toBeDefined();
      expect(screen.getByText('Indomie Goreng')).toBeDefined();
      expect(screen.getByText('Cetak Label Rak')).toBeDefined();
    });
  });

  it('memfilter sel saat memasukkan kata kunci pencarian', async () => {
    render(<WarehouseMap initialWarehouseId="wh-1" />);

    await waitFor(() => {
      expect(screen.getByText('A-01-01')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Cari SKU, produk, kode rak/i);
    fireEvent.change(searchInput, { target: { value: '01-01' } });

    // A-01-01 matches
    expect(screen.getByText('A-01-01')).toBeDefined();
    // A-01-02 does not match filter
    expect(screen.queryByText('A-01-02')).toBeNull();
  });
});
