import { prisma, type Prisma } from '../database/prisma';

export type SequenceType = 'MRN' | 'VISIT' | 'INVOICE' | 'PRESCRIPTION' | 'RECEIPT' | 'ADJUSTMENT';

const DEFAULT_PREFIXES: Record<SequenceType, string> = {
  MRN: `MRN-${new Date().getFullYear()}-`,
  VISIT: `VST-${new Date().getFullYear()}-`,
  INVOICE: `INV-${new Date().getFullYear()}-`,
  PRESCRIPTION: `RX-${new Date().getFullYear()}-`,
  RECEIPT: `REC-${new Date().getFullYear()}-`,
  ADJUSTMENT: `ADJ-${new Date().getFullYear()}-`,
};

export class NumberingService {
  /**
   * Generates a concurrency-safe, gapless sequential number using row-level locking
   */
  static async getNextNumber(type: SequenceType, customTx?: Prisma.TransactionClient): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `${type.substring(0, 3)}-${currentYear}-`;

    // Perform inside transaction with row-level lock
    if (customTx) {
      return await this.executeNumbering(customTx, type, prefix);
    } else {
      return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        return await this.executeNumbering(tx, type, prefix);
      });
    }
  }

  private static async executeNumbering(tx: Prisma.TransactionClient, type: SequenceType, defaultPrefix: string): Promise<string> {
    let counter = await tx.sequenceCounter.findUnique({
      where: { name: type },
    });

    if (!counter) {
      counter = await tx.sequenceCounter.create({
        data: {
          name: type,
          prefix: defaultPrefix,
          currentVal: 0,
        },
      });
    }

    const nextVal = counter.currentVal + 1;

    await tx.sequenceCounter.update({
      where: { name: type },
      data: {
        currentVal: nextVal,
        prefix: defaultPrefix,
      },
    });

    const formattedSequence = String(nextVal).padStart(6, '0');
    return `${defaultPrefix}${formattedSequence}`;
  }
}
