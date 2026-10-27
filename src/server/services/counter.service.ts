import { prisma } from '@/server/db';
import type { Prisma } from '@prisma/client';

export type DocumentPrefix = 'GR' | 'DO' | 'SO' | 'TR' | 'ADJ' | 'RET';

/**
 * Atomic document numbering service per ARCHITECTURE.md and BR-15.
 * Format: PREFIX-YYYY-XXXX (e.g. GR-2026-0001, DO-2026-0001)
 * Document numbers are never reused even if documents are cancelled (BR-15).
 */
export async function getNextDocumentNumber(
  prefix: DocumentPrefix,
  tx?: Prisma.TransactionClient,
): Promise<string> {
  const client = tx || prisma;
  const year = new Date().getFullYear();
  const counterName = `${prefix}-${year}`;

  const counter = await client.documentCounter.upsert({
    where: { name: counterName },
    update: { currentValue: { increment: 1 } },
    create: { name: counterName, currentValue: 1 },
  });

  const paddedNumber = String(counter.currentValue).padStart(4, '0');
  return `${prefix}-${year}-${paddedNumber}`;
}
