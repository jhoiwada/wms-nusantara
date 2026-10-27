import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/server/db', () => ({
  prisma: {
    deliveryOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    stockMovement: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    location: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock('../counter.service', () => ({
  getNextDocumentNumber: vi.fn().mockResolvedValue('RET-2026-0001'),
}));

vi.mock('../stock.service', () => ({
  applyStockMovement: vi.fn().mockResolvedValue({
    movement: { id: 'mov-1', quantity: 10, balanceAfter: 110 },
    previousBalance: 100,
    newBalance: 110,
  }),
}));

import { prisma } from '@/server/db';
import {
  createCustomerReturn,
  getDeliveryOrderReturnDetails,
  listShippedDeliveryOrdersForReturn,
} from '../customer-return.service';

type DOMock = Awaited<ReturnType<typeof prisma.deliveryOrder.findUnique>>;
type MovementsMock = Awaited<ReturnType<typeof prisma.stockMovement.findMany>>;
type LocationMock = Awaited<ReturnType<typeof prisma.location.findUnique>>;

describe('Customer Return Service (T3.6, BR-18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockShippedDO = {
    id: 'do-1',
    orderNo: 'DO-2026-0001',
    status: 'SHIPPED',
    shippedAt: new Date(),
    notes: 'Kirim ke customer',
    customer: { id: 'cust-1', code: 'CUST-001', name: 'PT Maju Bersama' },
    warehouse: { id: 'wh-1', code: 'WH-JKT', name: 'Gudang Jakarta' },
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        batchId: 'batch-1',
        locationId: 'loc-1',
        quantity: 50,
        product: { id: 'prod-1', sku: 'SKU-001', name: 'Indomie Goreng', uom: 'DUS' },
        batch: { id: 'batch-1', batchNo: 'B-001', expiryDate: new Date('2026-12-31') },
        location: { id: 'loc-1', code: 'A-01-01' },
      },
    ],
  };

  it('menolak retur jika peran pengguna adalah VIEWER (BR-35)', async () => {
    await expect(
      createCustomerReturn(
        {
          deliveryOrderId: 'do-1',
          reasonCategory: 'DAMAGED',
          notes: 'Barang rusak fisik saat pengiriman',
          items: [
            {
              productId: 'prod-1',
              batchId: 'batch-1',
              locationId: 'loc-1',
              quantity: 5,
            },
          ],
        },
        { id: 'usr-viewer', role: 'VIEWER', name: 'Viewer User' },
      ),
    ).rejects.toThrow('Pengguna dengan peran Viewer tidak diizinkan');
  });

  it('menolak retur jika status DO bukan SHIPPED (BR-18)', async () => {
    vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValueOnce({
      ...mockShippedDO,
      status: 'DRAFT',
    } as unknown as DOMock);

    await expect(getDeliveryOrderReturnDetails('do-1')).rejects.toThrow(
      'Hanya Delivery Order yang berstatus SHIPPED yang dapat diretur',
    );
  });

  it('menghitung kuantitas sisa yang dapat diretur dengan mengurangi retur sebelumnya', async () => {
    vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValueOnce(
      mockShippedDO as unknown as DOMock,
    );
    // Previous returns: already returned 20 units
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValueOnce([
      {
        productId: 'prod-1',
        batchId: 'batch-1',
        quantity: 20,
        refNo: 'RET-2026-0000',
        createdAt: new Date(),
      },
    ] as unknown as MovementsMock);

    const details = await getDeliveryOrderReturnDetails('do-1');

    expect(details.items[0]?.shippedQuantity).toBe(50);
    expect(details.items[0]?.returnedQuantity).toBe(20);
    expect(details.items[0]?.returnableQuantity).toBe(30); // 50 - 20 = 30
  });

  it('menolak jika kuantitas retur melebihi sisa yang dapat diretur', async () => {
    vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValueOnce(
      mockShippedDO as unknown as DOMock,
    );
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValueOnce([]); // 0 previously returned

    await expect(
      createCustomerReturn(
        {
          deliveryOrderId: 'do-1',
          reasonCategory: 'WRONG_ITEM',
          notes: 'Salah kirim barang ke customer',
          items: [
            {
              productId: 'prod-1',
              batchId: 'batch-1',
              locationId: 'loc-1',
              quantity: 60, // 60 > 50 -> ERROR
            },
          ],
        },
        { id: 'usr-staff', role: 'STAFF', name: 'Staff Gudang' },
      ),
    ).rejects.toThrow('melebihi kuantitas sisa yang dapat diretur');
  });

  it('menolak jika lokasi rak tujuan sedang dibekukan karena opname (BR-22)', async () => {
    vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValueOnce(
      mockShippedDO as unknown as DOMock,
    );
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValueOnce([]);

    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce({
      id: 'loc-1',
      code: 'A-01-01',
      isActive: true,
      isFrozen: true, // Frozen!
      warehouseId: 'wh-1',
    } as unknown as LocationMock);

    await expect(
      createCustomerReturn(
        {
          deliveryOrderId: 'do-1',
          reasonCategory: 'DAMAGED',
          notes: 'Barang cacat kemasan',
          items: [
            {
              productId: 'prod-1',
              batchId: 'batch-1',
              locationId: 'loc-1',
              quantity: 5,
            },
          ],
        },
        { id: 'usr-staff', role: 'STAFF', name: 'Staff Gudang' },
      ),
    ).rejects.toThrow('sedang dibekukan karena opname (BR-22)');
  });

  it('berhasil memproses retur customer dengan nomor RET-YYYY-XXXX dan mutasi IN', async () => {
    vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValueOnce(
      mockShippedDO as unknown as DOMock,
    );
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValueOnce([]);

    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce({
      id: 'loc-1',
      code: 'A-01-01',
      isActive: true,
      isFrozen: false,
      warehouseId: 'wh-1',
    } as unknown as LocationMock);

    const result = await createCustomerReturn(
      {
        deliveryOrderId: 'do-1',
        reasonCategory: 'DAMAGED',
        notes: 'Kemasan rusak saat sampai di customer',
        items: [
          {
            productId: 'prod-1',
            batchId: 'batch-1',
            locationId: 'loc-1',
            quantity: 10,
          },
        ],
      },
      { id: 'usr-staff', role: 'STAFF', name: 'Staff Gudang' },
    );

    expect(result.returnNo).toBe('RET-2026-0001');
    expect(result.customer.name).toBe('PT Maju Bersama');
    expect(result.totalUnits).toBe(10);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('mendaftar DO yang berstatus SHIPPED untuk pemilihan retur', async () => {
    vi.mocked(prisma.deliveryOrder.findMany).mockResolvedValueOnce([
      {
        id: 'do-1',
        orderNo: 'DO-2026-0001',
        shippedAt: new Date(),
        notes: null,
        customer: { id: 'cust-1', code: 'CUST-1', name: 'PT Maju' },
        warehouse: { id: 'wh-1', code: 'WH-1', name: 'Gudang 1' },
        _count: { items: 2 },
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.deliveryOrder.findMany>>);

    const orders = await listShippedDeliveryOrdersForReturn();
    expect(orders).toHaveLength(1);
    expect(orders[0]?.orderNo).toBe('DO-2026-0001');
  });
});
