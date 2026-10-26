import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

// Stateful In-Memory Database Simulator for E2E Flow Testing
interface MockProduct {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  uom: string;
  minStock: number;
  costPrice: Prisma.Decimal;
  trackExpiry: boolean;
  isActive: boolean;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
}

interface MockLocation {
  id: string;
  code: string;
  warehouseId: string;
  zone: string;
  rack: string;
  level: string;
  isFrozen: boolean;
  isActive: boolean;
  warehouse?: { id: string; code: string; name: string; isActive?: boolean } | null;
}

interface MockBatch {
  id: string;
  productId: string;
  batchNo: string;
  expiryDate: Date | null;
}

interface MockStock {
  id: string;
  warehouseId: string;
  locationId: string;
  productId: string;
  batchId: string;
  quantity: number;
  batch?: MockBatch | null;
  location?: MockLocation | null;
  product?: MockProduct | null;
}

interface MockStockMovement {
  id: string;
  productId: string;
  locationId: string;
  batchId: string;
  movementType: string;
  quantity: number;
  balanceAfter: number;
  refType: string;
  refId: string;
  refNo: string;
  userId: string;
  notes: string | null;
  createdAt: Date;
  location?: MockLocation | null;
  batch?: MockBatch | null;
  user?: { id: string; email: string; name: string } | null;
}

interface MockGoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  productId: string;
  locationId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  batchNo: string;
  expiryDate: Date | null;
  product?: MockProduct | null;
  location?: MockLocation | null;
}

interface MockGoodsReceipt {
  id: string;
  receiptNo: string;
  supplierId: string;
  warehouseId: string;
  status: string;
  receivedAt: Date | null;
  receivedById?: string | null;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  items: MockGoodsReceiptItem[];
  supplier?: { id: string; code: string; name: string; isActive: boolean } | null;
  warehouse?: { id: string; code: string; name: string; isActive: boolean } | null;
}

interface MockDeliveryOrderItem {
  id: string;
  deliveryOrderId: string;
  productId: string;
  locationId: string;
  batchId: string | null;
  quantity: number;
  product?: MockProduct | null;
  location?: MockLocation | null;
  batch?: MockBatch | null;
}

interface MockDeliveryOrder {
  id: string;
  orderNo: string;
  customerId: string;
  warehouseId: string;
  status: string;
  shippedAt: Date | null;
  shippedById?: string | null;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  items: MockDeliveryOrderItem[];
  customer?: { id: string; code: string; name: string; isActive: boolean } | null;
  warehouse?: { id: string; code: string; name: string; isActive: boolean } | null;
}

interface MockDatabase {
  users: Array<{
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';
    isActive: boolean;
  }>;
  warehouses: Array<{
    id: string;
    code: string;
    name: string;
    address: string | null;
    isActive: boolean;
  }>;
  suppliers: Array<{
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  }>;
  customers: Array<{
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  }>;
  products: MockProduct[];
  locations: MockLocation[];
  batches: MockBatch[];
  stocks: MockStock[];
  stockMovements: MockStockMovement[];
  documentCounters: Array<{
    id: string;
    name: string;
    currentValue: number;
    updatedAt: Date;
  }>;
  goodsReceipts: MockGoodsReceipt[];
  deliveryOrders: MockDeliveryOrder[];
}

function createInitialState(): MockDatabase {
  const staffHash = bcrypt.hashSync('Password123!', 10);
  const viewerHash = bcrypt.hashSync('Password123!', 10);

  return {
    users: [
      {
        id: 'user-staff',
        email: 'staff@wms.local',
        name: 'Staff Gudang',
        passwordHash: staffHash,
        role: 'STAFF',
        isActive: true,
      },
      {
        id: 'user-viewer',
        email: 'viewer@wms.local',
        name: 'Tamu Viewer',
        passwordHash: viewerHash,
        role: 'VIEWER',
        isActive: true,
      },
    ],
    warehouses: [
      {
        id: 'wh-jkt',
        code: 'WH-JKT',
        name: 'Gudang Utama Jakarta',
        address: 'Jl. Daan Mogot No. 45, Jakarta Barat',
        isActive: true,
      },
      {
        id: 'wh-bks',
        code: 'WH-BKS',
        name: 'Gudang Cabang Bekasi',
        address: 'Jl. Ahmad Yani No. 12, Bekasi Timur',
        isActive: true,
      },
    ],
    suppliers: [
      {
        id: 'sup-indofood',
        code: 'SUP-IND',
        name: 'PT Indofood Sukses Makmur',
        isActive: true,
      },
    ],
    customers: [
      {
        id: 'cust-berkah',
        code: 'CUST-BERKAH',
        name: 'Toko Berkah Abadi',
        isActive: true,
      },
    ],
    products: [
      {
        id: 'prod-indomie',
        sku: 'FNB-IND-001',
        barcode: '8998866200114',
        name: 'Indomie Goreng Spesial 85g',
        uom: 'KARTON',
        minStock: 25,
        costPrice: new Prisma.Decimal('115000'),
        trackExpiry: true,
        isActive: true,
        categoryId: 'cat-sembako',
        category: {
          id: 'cat-sembako',
          name: 'Sembako & Makanan Ringan',
        },
      },
    ],
    locations: [
      {
        id: 'loc-a0101',
        code: 'A-01-01',
        warehouseId: 'wh-jkt',
        zone: 'A',
        rack: '01',
        level: '01',
        isFrozen: false,
        isActive: true,
      },
      {
        id: 'loc-b0101',
        code: 'B-01-01',
        warehouseId: 'wh-bks',
        zone: 'B',
        rack: '01',
        level: '01',
        isFrozen: false,
        isActive: true,
      },
    ],
    batches: [],
    stocks: [],
    stockMovements: [],
    documentCounters: [],
    goodsReceipts: [],
    deliveryOrders: [],
  };
}

let dbState: MockDatabase = createInitialState();

// Wire up in-memory mock handlers for Prisma Client
vi.mock('@/server/db', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(vi.mocked(prisma))),
    $queryRaw: vi.fn(async (_strings: unknown, ...values: unknown[]) => {
      const [productId, locationId, batchId] = values as [string, string, string];
      const match = dbState.stocks.find(
        (s) => s.productId === productId && s.locationId === locationId && s.batchId === batchId,
      );
      return match ? [{ id: match.id, quantity: match.quantity }] : [];
    }),
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.email) {
          return dbState.users.find((u) => u.email === where.email) ?? null;
        }
        if (where.id) {
          return dbState.users.find((u) => u.id === where.id) ?? null;
        }
        return null;
      }),
    },
    warehouse: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; code?: string } }) => {
        return dbState.warehouses.find((w) => w.id === where.id || w.code === where.code) ?? null;
      }),
    },
    supplier: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; code?: string } }) => {
        return dbState.suppliers.find((s) => s.id === where.id || s.code === where.code) ?? null;
      }),
    },
    customer: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; code?: string } }) => {
        return dbState.customers.find((c) => c.id === where.id || c.code === where.code) ?? null;
      }),
    },
    product: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; sku?: string } }) => {
        const prod = dbState.products.find((p) => p.id === where.id || p.sku === where.sku);
        return prod ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where?: { id?: string | { in: string[] } } } = {}) => {
        if (where?.id && typeof where.id === 'object' && Array.isArray(where.id.in)) {
          return dbState.products.filter((p) => (where.id as { in: string[] }).in.includes(p.id));
        }
        if (where?.id && typeof where.id === 'string') {
          return dbState.products.filter((p) => p.id === where.id);
        }
        return dbState.products;
      }),
      count: vi.fn(async () => dbState.products.length),
    },
    location: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; code?: string } }) => {
        return dbState.locations.find((l) => l.id === where.id || l.code === where.code) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where?: { id?: string | { in: string[] } } } = {}) => {
        if (where?.id && typeof where.id === 'object' && Array.isArray(where.id.in)) {
          return dbState.locations.filter((l) => (where.id as { in: string[] }).in.includes(l.id));
        }
        return dbState.locations;
      }),
      count: vi.fn(async () => dbState.locations.length),
    },
    batch: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { id?: string; productId_batchNo?: { productId: string; batchNo: string } };
        }) => {
          if (where.id) {
            return dbState.batches.find((b) => b.id === where.id) ?? null;
          }
          if (where.productId_batchNo) {
            return (
              dbState.batches.find(
                (b) =>
                  b.productId === where.productId_batchNo!.productId &&
                  b.batchNo === where.productId_batchNo!.batchNo,
              ) ?? null
            );
          }
          return null;
        },
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: { productId: string; batchNo: string; expiryDate?: Date | null };
        }) => {
          const batch: MockBatch = {
            id: `batch-${dbState.batches.length + 1}`,
            productId: data.productId,
            batchNo: data.batchNo,
            expiryDate: data.expiryDate ?? null,
          };
          dbState.batches.push(batch);
          return batch;
        },
      ),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { productId_batchNo: { productId: string; batchNo: string } };
          create: { productId: string; batchNo: string; expiryDate?: Date | null };
          update: { expiryDate?: Date | null };
        }) => {
          const existing = dbState.batches.find(
            (b) =>
              b.productId === where.productId_batchNo.productId &&
              b.batchNo === where.productId_batchNo.batchNo,
          );
          if (existing) {
            if (update.expiryDate !== undefined) {
              existing.expiryDate = update.expiryDate;
            }
            return existing;
          }
          const newBatch: MockBatch = {
            id: `batch-${dbState.batches.length + 1}`,
            productId: create.productId,
            batchNo: create.batchNo,
            expiryDate: create.expiryDate ?? null,
          };
          dbState.batches.push(newBatch);
          return newBatch;
        },
      ),
    },
    stock: {
      findMany: vi.fn(
        async ({
          where,
          orderBy,
        }: {
          where?: { productId?: string; locationId?: string; quantity?: { gt?: number } };
          orderBy?: Array<
            { batch?: { expiryDate: 'asc' | 'desc' } } | { quantity: 'asc' | 'desc' }
          >;
        } = {}) => {
          let list = [...dbState.stocks];
          if (where?.productId) {
            list = list.filter((s) => s.productId === where.productId);
          }
          if (where?.locationId) {
            list = list.filter((s) => s.locationId === where.locationId);
          }
          if (where?.quantity?.gt !== undefined) {
            list = list.filter((s) => s.quantity > where.quantity!.gt!);
          }
          const mapped = list.map((s) => ({
            ...s,
            batch: dbState.batches.find((b) => b.id === s.batchId) ?? null,
            product: dbState.products.find((p) => p.id === s.productId) ?? null,
            location: dbState.locations.find((l) => l.id === s.locationId) ?? null,
          }));

          if (Array.isArray(orderBy)) {
            mapped.sort((a, b) => {
              const expA = a.batch?.expiryDate ? new Date(a.batch.expiryDate).getTime() : Infinity;
              const expB = b.batch?.expiryDate ? new Date(b.batch.expiryDate).getTime() : Infinity;
              if (expA !== expB) return expA - expB;
              return b.quantity - a.quantity;
            });
          }
          return mapped;
        },
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            warehouseId?: string;
            locationId: string;
            productId: string;
            batchId: string;
            quantity: number;
          };
        }) => {
          const item: MockStock = {
            id: `stock-${dbState.stocks.length + 1}`,
            warehouseId: data.warehouseId ?? 'wh-jkt',
            locationId: data.locationId,
            productId: data.productId,
            batchId: data.batchId,
            quantity: data.quantity,
          };
          dbState.stocks.push(item);
          return item;
        },
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: { quantity?: number } }) => {
          const target = dbState.stocks.find((s) => s.id === where.id);
          if (!target) throw new Error(`Stock row ${where.id} not found`);
          if (typeof data.quantity === 'number') {
            target.quantity = data.quantity;
          }
          return target;
        },
      ),
    },
    stockMovement: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            productId: string;
            locationId: string;
            batchId: string;
            movementType: string;
            quantity: number;
            balanceAfter: number;
            refType?: string;
            refId?: string;
            refNo?: string;
            userId?: string;
            notes?: string | null;
            referenceType?: string;
            referenceNo?: string;
            createdById?: string;
          };
        }) => {
          const m: MockStockMovement = {
            id: `sm-${dbState.stockMovements.length + 1}`,
            productId: data.productId,
            locationId: data.locationId,
            batchId: data.batchId,
            movementType: data.movementType,
            quantity: data.quantity,
            balanceAfter: data.balanceAfter,
            refType: data.refType ?? data.referenceType ?? 'MANUAL',
            refId: data.refId ?? '',
            refNo: data.refNo ?? data.referenceNo ?? '',
            userId: data.userId ?? data.createdById ?? 'user-staff',
            notes: data.notes ?? null,
            createdAt: new Date(Date.now() + dbState.stockMovements.length * 1000),
          };
          dbState.stockMovements.push(m);
          return m;
        },
      ),
      findMany: vi.fn(
        async ({
          where,
          orderBy,
        }: {
          where?: { productId?: string; locationId?: string };
          orderBy?: { createdAt?: 'asc' | 'desc' };
        } = {}) => {
          let list = [...dbState.stockMovements];
          if (where?.productId) {
            list = list.filter((m) => m.productId === where.productId);
          }
          if (where?.locationId) {
            list = list.filter((m) => m.locationId === where.locationId);
          }
          if (orderBy?.createdAt === 'desc') {
            list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          } else if (orderBy?.createdAt === 'asc') {
            list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          }
          return list.map((m) => ({
            ...m,
            location: {
              ...dbState.locations.find((l) => l.id === m.locationId),
              warehouse: dbState.warehouses.find((w) => w.id === 'wh-jkt'),
            },
            batch: dbState.batches.find((b) => b.id === m.batchId),
            user: dbState.users.find((u) => u.id === m.userId),
          }));
        },
      ),
      count: vi.fn(async ({ where }: { where?: { productId?: string } } = {}) => {
        let list = [...dbState.stockMovements];
        if (where?.productId) {
          list = list.filter((m) => m.productId === where.productId);
        }
        return list.length;
      }),
    },
    documentCounter: {
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { name: string };
          create: { currentValue: number };
          update: { currentValue?: { increment: number } };
        }) => {
          const counter = dbState.documentCounters.find((c) => c.name === where.name);
          if (counter) {
            if (update.currentValue?.increment) {
              counter.currentValue += update.currentValue.increment;
            }
            counter.updatedAt = new Date();
            return counter;
          }
          const newCounter = {
            id: `c-${dbState.documentCounters.length + 1}`,
            name: where.name,
            currentValue: create.currentValue,
            updatedAt: new Date(),
          };
          dbState.documentCounters.push(newCounter);
          return newCounter;
        },
      ),
    },
    goodsReceipt: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            receiptNo: string;
            supplierId: string;
            warehouseId: string;
            status: string;
            receivedAt?: Date | string | null;
            notes?: string | null;
            createdById: string;
            items?: {
              create: Array<{
                productId: string;
                locationId: string;
                quantity: number;
                unitPrice: Prisma.Decimal;
                batchNo: string;
                expiryDate?: Date | null;
              }>;
            };
          };
        }) => {
          const grId = `gr-${dbState.goodsReceipts.length + 1}`;
          const items: MockGoodsReceiptItem[] = (data.items?.create ?? []).map(
            (item, idx: number) => ({
              id: `gri-${grId}-${idx + 1}`,
              goodsReceiptId: grId,
              productId: item.productId,
              locationId: item.locationId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              batchNo: item.batchNo,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              product: dbState.products.find((p) => p.id === item.productId) ?? null,
              location: dbState.locations.find((l) => l.id === item.locationId) ?? null,
            }),
          );

          const gr: MockGoodsReceipt = {
            id: grId,
            receiptNo: data.receiptNo,
            supplierId: data.supplierId,
            warehouseId: data.warehouseId,
            status: data.status,
            receivedAt: data.receivedAt ? new Date(data.receivedAt) : null,
            notes: data.notes ?? null,
            createdById: data.createdById,
            createdAt: new Date(),
            updatedAt: new Date(),
            items,
            supplier: dbState.suppliers.find((s) => s.id === data.supplierId) ?? null,
            warehouse: dbState.warehouses.find((w) => w.id === data.warehouseId) ?? null,
          };
          dbState.goodsReceipts.push(gr);
          return gr;
        },
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return dbState.goodsReceipts.find((g) => g.id === where.id) ?? null;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status?: string; receivedAt?: Date | string; receivedById?: string };
        }) => {
          const gr = dbState.goodsReceipts.find((g) => g.id === where.id);
          if (!gr) throw new Error(`Goods Receipt ${where.id} not found`);
          if (data.status) gr.status = data.status;
          if (data.receivedAt) gr.receivedAt = new Date(data.receivedAt);
          if (data.receivedById) gr.receivedById = data.receivedById;
          return gr;
        },
      ),
    },
    goodsReceiptItem: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    deliveryOrder: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            orderNo: string;
            customerId: string;
            warehouseId: string;
            status: string;
            shippedAt?: Date | string | null;
            notes?: string | null;
            createdById: string;
            items?: {
              create: Array<{
                productId: string;
                locationId: string;
                batchId?: string | null;
                quantity: number;
              }>;
            };
          };
        }) => {
          const doId = `do-${dbState.deliveryOrders.length + 1}`;
          const items: MockDeliveryOrderItem[] = (data.items?.create ?? []).map(
            (item, idx: number) => ({
              id: `doi-${doId}-${idx + 1}`,
              deliveryOrderId: doId,
              productId: item.productId,
              locationId: item.locationId,
              batchId: item.batchId ?? null,
              quantity: item.quantity,
              product: dbState.products.find((p) => p.id === item.productId) ?? null,
              location: dbState.locations.find((l) => l.id === item.locationId) ?? null,
              batch: item.batchId
                ? (dbState.batches.find((b) => b.id === item.batchId) ?? null)
                : null,
            }),
          );

          const dOrder: MockDeliveryOrder = {
            id: doId,
            orderNo: data.orderNo,
            customerId: data.customerId,
            warehouseId: data.warehouseId,
            status: data.status,
            shippedAt: data.shippedAt ? new Date(data.shippedAt) : null,
            notes: data.notes ?? null,
            createdById: data.createdById,
            createdAt: new Date(),
            updatedAt: new Date(),
            items,
            customer: dbState.customers.find((c) => c.id === data.customerId) ?? null,
            warehouse: dbState.warehouses.find((w) => w.id === data.warehouseId) ?? null,
          };
          dbState.deliveryOrders.push(dOrder);
          return dOrder;
        },
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return dbState.deliveryOrders.find((d) => d.id === where.id) ?? null;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status?: string; shippedAt?: Date | string; shippedById?: string };
        }) => {
          const dOrder = dbState.deliveryOrders.find((d) => d.id === where.id);
          if (!dOrder) throw new Error(`Delivery Order ${where.id} not found`);
          if (data.status) dOrder.status = data.status;
          if (data.shippedAt) dOrder.shippedAt = new Date(data.shippedAt);
          if (data.shippedById) dOrder.shippedById = data.shippedById;
          return dOrder;
        },
      ),
    },
    deliveryOrderItem: {
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: { batchId?: string } }) => {
          for (const dOrder of dbState.deliveryOrders) {
            const it = dOrder.items.find((i) => i.id === where.id);
            if (it) {
              if (data.batchId !== undefined) {
                it.batchId = data.batchId;
                it.batch = dbState.batches.find((b) => b.id === data.batchId) ?? null;
              }
              return it;
            }
          }
          return null;
        },
      ),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

import { prisma } from '@/server/db';
import { loginUser } from '../auth.service';
import { verifySessionToken } from '@/server/auth/session';
import { requireRole } from '@/server/auth/rbac';
import {
  createGoodsReceipt,
  receiveGoodsReceipt,
  updateGoodsReceipt,
} from '../goods-receipt.service';
import {
  createDeliveryOrder,
  shipDeliveryOrder,
  updateDeliveryOrder,
} from '../delivery-order.service';
import { getProductStockCard, verifyStockConsistency } from '../stock.service';

describe('T1.11 End-to-End Operational Lifecycle: Login -> GR -> DO -> Cek Kartu Stok', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbState = createInitialState();
  });

  it('runs complete enterprise operational lifecycle across auth, incoming, outgoing, stock cards, and invariant consistency', async () => {
    // =========================================================================
    // 1. LOGIN & RBAC SESSION (T1.1, docs/SECURITY.md)
    // =========================================================================
    const loginResult = await loginUser({
      email: 'staff@wms.local',
      password: 'Password123!',
    });

    expect(loginResult).toBeDefined();
    expect(loginResult.user.email).toBe('staff@wms.local');
    expect(loginResult.user.role).toBe('STAFF');
    expect(loginResult.token).toBeTruthy();

    // Verify JWT token signature and decode claims
    const verifiedSession = await verifySessionToken(loginResult.token);
    expect(verifiedSession).not.toBeNull();
    expect(verifiedSession?.id).toBe(loginResult.user.id);
    expect(verifiedSession?.role).toBe('STAFF');

    // Server RBAC guard verification
    const activeStaff = await requireRole(['ADMIN', 'MANAGER', 'STAFF'], loginResult.token);
    expect(activeStaff.id).toBe('user-staff');
    expect(activeStaff.role).toBe('STAFF');

    // Check initial stock card is zero before any transaction
    const initialStockCard = await getProductStockCard('prod-indomie', { warehouseId: 'wh-jkt' });
    expect(initialStockCard.currentStock).toBe(0);
    expect(initialStockCard.movements).toHaveLength(0);

    // =========================================================================
    // 2. BARANG MASUK / GOODS RECEIPT (T1.7, BR-06, BR-07, BR-11, BR-12, BR-14)
    // =========================================================================
    const grInput = {
      supplierId: 'sup-indofood',
      warehouseId: 'wh-jkt',
      receivedAt: '2026-10-27T08:00:00.000Z',
      notes: 'Penerimaan batch perdana Indomie Goreng dari pabrik',
      items: [
        {
          productId: 'prod-indomie',
          locationId: 'loc-a0101',
          quantity: 100, // 100 karton
          unitPrice: 115000,
          batchNo: 'B2026-A1',
          expiryDate: '2027-12-31T00:00:00.000Z',
        },
      ],
    };

    // 2a. Create Draft GR
    const draftGR = await createGoodsReceipt(grInput, activeStaff.id);
    expect(draftGR.id).toBe('gr-1');
    expect(draftGR.receiptNo).toBe('GR-2026-0001');
    expect(draftGR.status).toBe('DRAFT');
    expect(draftGR.items).toHaveLength(1);
    expect(draftGR.items[0]?.quantity).toBe(100);

    // Stock has not moved yet in DRAFT status
    const draftStockCard = await getProductStockCard('prod-indomie');
    expect(draftStockCard.currentStock).toBe(0);

    // 2b. Confirm & Receive Goods Receipt atomically
    const receivedGR = await receiveGoodsReceipt(draftGR.id, activeStaff.id);
    expect(receivedGR.status).toBe('RECEIVED');
    expect(receivedGR.receivedAt).toBeDefined();

    // Verify batch record was created
    const createdBatch = dbState.batches.find((b) => b.batchNo === 'B2026-A1');
    expect(createdBatch).toBeDefined();
    expect(createdBatch?.productId).toBe('prod-indomie');

    // Verify physical stock table was updated to 100
    const stockRowAfterGR = dbState.stocks.find(
      (s) => s.productId === 'prod-indomie' && s.locationId === 'loc-a0101',
    );
    expect(stockRowAfterGR).toBeDefined();
    expect(stockRowAfterGR?.quantity).toBe(100);

    // Verify append-only movement log (type IN, balanceAfter 100)
    const grMovement = dbState.stockMovements.find((m) => m.refNo === 'GR-2026-0001');
    expect(grMovement).toBeDefined();
    expect(grMovement?.movementType).toBe('IN');
    expect(grMovement?.quantity).toBe(100);
    expect(grMovement?.balanceAfter).toBe(100);

    // 2c. Stock Card check after GR
    const stockCardAfterGR = await getProductStockCard('prod-indomie');
    expect(stockCardAfterGR.currentStock).toBe(100);
    expect(stockCardAfterGR.movements).toHaveLength(1);
    expect(stockCardAfterGR.movements[0]?.refNo).toBe('GR-2026-0001');
    expect(stockCardAfterGR.movements[0]?.balanceAfter).toBe(100);

    // 2d. Invariant check: SUM(movements) == SUM(stocks)
    const consistencyAfterGR = await verifyStockConsistency('prod-indomie');
    expect(consistencyAfterGR.isConsistent).toBe(true);
    expect(consistencyAfterGR.results[0]?.movementSum).toBe(100);
    expect(consistencyAfterGR.results[0]?.currentStock).toBe(100);
    expect(consistencyAfterGR.results[0]?.difference).toBe(0);

    // =========================================================================
    // 3. BARANG KELUAR / DELIVERY ORDER (T1.8, BR-08, BR-09, BR-15, BR-16, BR-17, BR-18)
    // =========================================================================
    const doInput = {
      customerId: 'cust-berkah',
      warehouseId: 'wh-jkt',
      notes: 'Pengiriman pesanan mingguan Toko Berkah Abadi',
      items: [
        {
          productId: 'prod-indomie',
          locationId: 'loc-a0101',
          quantity: 30, // Request 30 karton
          // Omitting batchId to verify automatic FEFO allocation per BR-08
        },
      ],
    };

    // 3a. Create Draft DO
    const draftDO = await createDeliveryOrder(doInput, activeStaff.id);
    expect(draftDO.id).toBe('do-1');
    expect(draftDO.orderNo).toBe('DO-2026-0001');
    expect(draftDO.status).toBe('DRAFT');
    expect(draftDO.items).toHaveLength(1);
    expect(draftDO.items[0]?.quantity).toBe(30);

    // 3b. Ship Delivery Order with FEFO allocation & ACID deduction
    const shippedDO = await shipDeliveryOrder(draftDO.id, activeStaff.id);
    expect(shippedDO.status).toBe('SHIPPED');
    expect(shippedDO.shippedAt).toBeDefined();

    // Verify FEFO auto-allocated to B2026-A1
    expect(shippedDO.items[0]?.batchId).toBe(createdBatch?.id);

    // Verify physical stock decremented to 70 (100 - 30)
    expect(stockRowAfterGR?.quantity).toBe(70);

    // Verify append-only movement log (type OUT, balanceAfter 70)
    const doMovement = dbState.stockMovements.find((m) => m.refNo === 'DO-2026-0001');
    expect(doMovement).toBeDefined();
    expect(doMovement?.movementType).toBe('OUT');
    expect(doMovement?.quantity).toBe(30);
    expect(doMovement?.balanceAfter).toBe(70);

    // =========================================================================
    // 4. CEK KARTU STOK & INVARIANT SYSTEM AUDIT (T1.9, BR-01, BR-05, BR-29)
    // =========================================================================
    const finalStockCard = await getProductStockCard('prod-indomie', { warehouseId: 'wh-jkt' });
    expect(finalStockCard.currentStock).toBe(70);
    expect(finalStockCard.movements).toHaveLength(2);

    // Order of movements in stock card is descending by date
    const [latestMv, initialMv] = finalStockCard.movements;
    expect(latestMv?.refNo).toBe('DO-2026-0001');
    expect(latestMv?.movementType).toBe('OUT');
    expect(latestMv?.quantity).toBe(30);
    expect(latestMv?.balanceAfter).toBe(70);

    expect(initialMv?.refNo).toBe('GR-2026-0001');
    expect(initialMv?.movementType).toBe('IN');
    expect(initialMv?.quantity).toBe(100);
    expect(initialMv?.balanceAfter).toBe(100);

    // System-wide Consistency Check
    const finalConsistency = await verifyStockConsistency('prod-indomie');
    expect(finalConsistency.isConsistent).toBe(true);
    expect(finalConsistency.inconsistentCount).toBe(0);
    expect(finalConsistency.results[0]?.movementSum).toBe(70); // +100 - 30 = 70
    expect(finalConsistency.results[0]?.currentStock).toBe(70);
    expect(finalConsistency.results[0]?.difference).toBe(0);

    // =========================================================================
    // 5. NEGATIVE INVARIANT: INSUFFICIENT STOCK GUARD (BR-01, BR-17)
    // =========================================================================
    // Attempt to ship 100 karton when only 70 are left in inventory
    const excessDOInput = {
      customerId: 'cust-berkah',
      warehouseId: 'wh-jkt',
      notes: 'Pesanan melebihi sisa stok',
      items: [
        {
          productId: 'prod-indomie',
          locationId: 'loc-a0101',
          quantity: 100, // 100 > 70
        },
      ],
    };

    const excessDO = await createDeliveryOrder(excessDOInput, activeStaff.id);
    expect(excessDO.orderNo).toBe('DO-2026-0002');

    // Attempting to ship must throw INSUFFICIENT_STOCK and rollback
    await expect(shipDeliveryOrder(excessDO.id, activeStaff.id)).rejects.toThrowError(
      /Stok tidak mencukupi/,
    );

    // Invariant: Stock must remain untouched at 70
    expect(stockRowAfterGR?.quantity).toBe(70);
    const postRejectionCard = await getProductStockCard('prod-indomie');
    expect(postRejectionCard.currentStock).toBe(70);
    expect(postRejectionCard.movements).toHaveLength(2); // Still only 2 movements

    // =========================================================================
    // 6. IMMUTABILITY & DOCUMENT STATUS LOCKS (BR-11, BR-14, BR-16, BR-18)
    // =========================================================================
    // 6a. Already RECEIVED Goods Receipt cannot be edited
    await expect(
      updateGoodsReceipt(
        draftGR.id,
        {
          notes: 'Coba ubah GR setelah diterima',
        },
        activeStaff.id,
      ),
    ).rejects.toThrowError(/Hanya dokumen penerimaan berstatus DRAFT yang dapat diedit/);

    // 6b. Already RECEIVED Goods Receipt cannot be received again
    await expect(receiveGoodsReceipt(draftGR.id, activeStaff.id)).rejects.toThrowError(
      /Dokumen penerimaan ini sudah diterima sebelumnya/,
    );

    // 6c. Already SHIPPED Delivery Order cannot be edited
    await expect(
      updateDeliveryOrder(
        draftDO.id,
        {
          notes: 'Coba ubah DO setelah dikirim',
        },
        activeStaff.id,
      ),
    ).rejects.toThrowError(/Hanya dokumen berstatus DRAFT yang dapat diedit/);

    // 6d. Already SHIPPED Delivery Order cannot be shipped again
    await expect(shipDeliveryOrder(draftDO.id, activeStaff.id)).rejects.toThrowError(
      /sudah berstatus SHIPPED dan tidak dapat dikirim ulang/,
    );

    // =========================================================================
    // 7. SECURITY & RBAC ISOLATION (docs/SECURITY.md)
    // =========================================================================
    // Authenticate viewer user
    const viewerLogin = await loginUser({
      email: 'viewer@wms.local',
      password: 'Password123!',
    });
    expect(viewerLogin.user.role).toBe('VIEWER');

    // Viewer is rejected from staff operations
    await expect(
      requireRole(['ADMIN', 'MANAGER', 'STAFF'], viewerLogin.token),
    ).rejects.toThrowError(/Akses ditolak: peran VIEWER tidak memiliki izin/);

    // Viewer IS allowed on read-only operations
    const viewerAuth = await requireRole(
      ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
      viewerLogin.token,
    );
    expect(viewerAuth.role).toBe('VIEWER');
  });

  it('handles multi-batch FEFO prioritization (BR-08) correctly across multiple Goods Receipts and Delivery Orders', async () => {
    const staff = await loginUser({ email: 'staff@wms.local', password: 'Password123!' });

    // GR 1: 50 units with earlier expiry (2027-06-30)
    const gr1 = await createGoodsReceipt(
      {
        supplierId: 'sup-indofood',
        warehouseId: 'wh-jkt',
        notes: 'Batch awal expiry 2027',
        items: [
          {
            productId: 'prod-indomie',
            locationId: 'loc-a0101',
            quantity: 50,
            unitPrice: 115000,
            batchNo: 'B2027-EARLY',
            expiryDate: '2027-06-30T00:00:00.000Z',
          },
        ],
      },
      staff.user.id,
    );
    await receiveGoodsReceipt(gr1.id, staff.user.id);

    // GR 2: 50 units with later expiry (2028-12-31)
    const gr2 = await createGoodsReceipt(
      {
        supplierId: 'sup-indofood',
        warehouseId: 'wh-jkt',
        notes: 'Batch susulan expiry 2028',
        items: [
          {
            productId: 'prod-indomie',
            locationId: 'loc-a0101',
            quantity: 50,
            unitPrice: 115000,
            batchNo: 'B2028-LATER',
            expiryDate: '2028-12-31T00:00:00.000Z',
          },
        ],
      },
      staff.user.id,
    );
    await receiveGoodsReceipt(gr2.id, staff.user.id);

    // Verify stock summary has 100 units total across 2 batches
    const cardMid = await getProductStockCard('prod-indomie');
    expect(cardMid.currentStock).toBe(100);

    // DO: Request 40 units without specifying batch -> FEFO must choose B2027-EARLY
    const do1 = await createDeliveryOrder(
      {
        customerId: 'cust-berkah',
        warehouseId: 'wh-jkt',
        items: [
          {
            productId: 'prod-indomie',
            locationId: 'loc-a0101',
            quantity: 40,
          },
        ],
      },
      staff.user.id,
    );

    const shipped = await shipDeliveryOrder(do1.id, staff.user.id);
    expect(shipped.status).toBe('SHIPPED');

    // Confirm that the allocated batch is the earlier one
    const earlyBatch = dbState.batches.find((b) => b.batchNo === 'B2027-EARLY');
    expect(shipped.items[0]?.batchId).toBe(earlyBatch?.id);

    // Check remaining stock per batch
    const earlyStock = dbState.stocks.find(
      (s) => s.productId === 'prod-indomie' && s.batchId === earlyBatch?.id,
    );
    expect(earlyStock?.quantity).toBe(10); // 50 - 40 = 10

    const lateBatch = dbState.batches.find((b) => b.batchNo === 'B2028-LATER');
    const lateStock = dbState.stocks.find(
      (s) => s.productId === 'prod-indomie' && s.batchId === lateBatch?.id,
    );
    expect(lateStock?.quantity).toBe(50); // Unchanged

    // Consistency verify
    const audit = await verifyStockConsistency('prod-indomie');
    expect(audit.isConsistent).toBe(true);
    expect(audit.results[0]?.currentStock).toBe(60);
    expect(audit.results[0]?.movementSum).toBe(60);
  });

  it('prevents stock operations on frozen locations during stock opname (BR-22)', async () => {
    const staff = await loginUser({ email: 'staff@wms.local', password: 'Password123!' });

    // Freeze location A-01-01
    const loc = dbState.locations.find((l) => l.code === 'A-01-01');
    if (loc) loc.isFrozen = true;

    // Attempting to create GR targeting frozen location fails validation
    await expect(
      createGoodsReceipt(
        {
          supplierId: 'sup-indofood',
          warehouseId: 'wh-jkt',
          items: [
            {
              productId: 'prod-indomie',
              locationId: 'loc-a0101',
              quantity: 20,
              unitPrice: 115000,
              batchNo: 'B-FREEZE',
              expiryDate: '2027-12-31T00:00:00.000Z',
            },
          ],
        },
        staff.user.id,
      ),
    ).rejects.toThrowError(/sedang dibekukan/);
  });

  it('enforces warehouse location isolation (BR-13) - rejects location belonging to another warehouse', async () => {
    const staff = await loginUser({ email: 'staff@wms.local', password: 'Password123!' });

    // Attempt to create GR for Jakarta warehouse using Bekasi location
    await expect(
      createGoodsReceipt(
        {
          supplierId: 'sup-indofood',
          warehouseId: 'wh-jkt',
          items: [
            {
              productId: 'prod-indomie',
              locationId: 'loc-b0101', // Belongs to wh-bks!
              quantity: 20,
              unitPrice: 115000,
              batchNo: 'B-WRONG',
              expiryDate: '2027-12-31T00:00:00.000Z',
            },
          ],
        },
        staff.user.id,
      ),
    ).rejects.toThrowError(/tidak berada di gudang tujuan yang dipilih/);
  });
});
