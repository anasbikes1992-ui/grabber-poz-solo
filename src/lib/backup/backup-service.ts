/**
 * GRABBER BUSINESS OS — BACKUP, RESTORE & DATA EXPORT SERVICE
 * Full Business Portability, Data Freedom & Disaster Recovery
 */

export interface ExportDataPayload {
  business: any;
  branches: any[];
  warehouses: any[];
  products: any[];
  stockBalances: any[];
  customers: any[];
  polimPothaEntries: any[];
  suppliers: any[];
  orders: any[];
  journalEntries: any[];
  exportedAt: Date;
}

export class BackupService {
  /**
   * Generates a complete business data export snapshot.
   */
  public static async exportBusinessData(data: Omit<ExportDataPayload, 'exportedAt'>): Promise<ExportDataPayload> {
    return {
      ...data,
      exportedAt: new Date(),
    };
  }

  /**
   * Generates a CSV string for a tabular entity dataset.
   */
  public static generateCSV<T extends Record<string, any>>(records: T[]): string {
    if (records.length === 0) return '';
    const headers = Object.keys(records[0]);
    const headerLine = headers.join(',');

    const rows = records.map((r) =>
      headers
        .map((h) => {
          const val = r[h];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    );

    return [headerLine, ...rows].join('\n');
  }
}
