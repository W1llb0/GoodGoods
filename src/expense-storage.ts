import type { ExpenseRecord } from './expense-record';

const STORAGE_KEY: string = 'good-goods-expenses-v1';

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function isExpenseRecord(value: unknown): value is ExpenseRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const category = record.category;
  const id = record.id;
  const amount = record.amount;
  const description = record.description;
  const createdAt = record.createdAt;
  const validCategory =
    category === 'necessary' ||
    category === 'useful' ||
    category === 'investments' ||
    category === 'harmful';
  return (
    typeof id === 'string' &&
    typeof amount === 'number' &&
    typeof description === 'string' &&
    validCategory &&
    typeof createdAt === 'string'
  );
}

function parseRecords(raw: string): readonly ExpenseRecord[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const result: ExpenseRecord[] = [];
    for (const item of parsed) {
      if (isExpenseRecord(item)) {
        result.push(item);
      }
    }
    return result;
  } catch {
    return [];
  }
}

function writeRaw(records: readonly ExpenseRecord[]): void {
  const payload: string = JSON.stringify(records);
  window.localStorage.setItem(STORAGE_KEY, payload);
}

export const expenseStorage = {
  loadExpenses(): readonly ExpenseRecord[] {
    const raw: string | null = readRaw();
    if (raw === null) {
      return [];
    }
    return parseRecords(raw);
  },
  saveExpenses(records: readonly ExpenseRecord[]): void {
    writeRaw(records);
  },
  exportJson(): string {
    const records: readonly ExpenseRecord[] = this.loadExpenses();
    return JSON.stringify(records, null, 2);
  },
  importJson(payload: string): { readonly ok: true } | { readonly ok: false; readonly errorMessage: string } {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (!Array.isArray(parsed)) {
        return { ok: false, errorMessage: 'Файл должен содержать массив трат.' };
      }
      const next: ExpenseRecord[] = [];
      for (const item of parsed) {
        if (isExpenseRecord(item)) {
          next.push(item);
        }
      }
      writeRaw(next);
      return { ok: true };
    } catch {
      return { ok: false, errorMessage: 'Не удалось разобрать JSON.' };
    }
  },
};
