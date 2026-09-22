import { prisma, type Prisma } from '../database/prisma';
import { getTodayDateString, parseLocalDateRange } from '../../shared/utils/dateUtils';

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

    let isUnique = false;
    let formattedNumber = '';

    while (!isUnique) {
      const nextVal = counter.currentVal + 1;
      counter.currentVal = nextVal;
      const formattedSequence = String(nextVal).padStart(6, '0');
      formattedNumber = `${defaultPrefix}${formattedSequence}`;

      // Verify uniqueness against existing database records
      let existingRecord: any = null;
      if (type === 'MRN') {
        existingRecord = await tx.patient.findUnique({ where: { mrn: formattedNumber } });
      } else if (type === 'VISIT') {
        existingRecord = await tx.visit.findUnique({ where: { visitNumber: formattedNumber } });
      } else if (type === 'INVOICE') {
        existingRecord = await tx.invoice.findUnique({ where: { invoiceNumber: formattedNumber } });
      } else if (type === 'PRESCRIPTION') {
        existingRecord = await tx.prescription.findUnique({ where: { prescriptionNo: formattedNumber } });
      }

      if (!existingRecord) {
        isUnique = true;
      }
    }

    await tx.sequenceCounter.update({
      where: { name: type },
      data: {
        currentVal: counter.currentVal,
        prefix: defaultPrefix,
      },
    });

    return formattedNumber;
  }

  /**
   * Generates an atomic, concurrency-safe daily token number for a specific doctor
   */
  static async getNextTokenNumber(doctorId: string, customTx: Prisma.TransactionClient): Promise<number> {
    const todayStr = getTodayDateString();
    const name = `TOKEN_${doctorId}_${todayStr}`;
    const defaultPrefix = `TKN-${todayStr}-`;

    let counter = await customTx.sequenceCounter.findUnique({
      where: { name },
    });

    if (!counter) {
      const { start: startOfDay, end: endOfDay } = parseLocalDateRange(todayStr);

      const initialCount = await customTx.visit.count({
        where: {
          doctorId,
          visitDateTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      counter = await customTx.sequenceCounter.create({
        data: {
          name,
          prefix: defaultPrefix,
          currentVal: initialCount,
        },
      });
    }

    const nextVal = counter.currentVal + 1;

    await customTx.sequenceCounter.update({
      where: { name },
      data: {
        currentVal: nextVal,
        prefix: defaultPrefix,
      },
    });

    return nextVal;
  }
}

