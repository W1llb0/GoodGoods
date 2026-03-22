import type { ExpenseRecord } from './expense-record';

export function computeCategoryTotals(records: readonly ExpenseRecord[]): Readonly<{
  necessary: number;
  useful: number;
  investments: number;
  harmful: number;
}> {
  let necessary: number = 0;
  let useful: number = 0;
  let investments: number = 0;
  let harmful: number = 0;
  for (const record of records) {
    if (record.category === 'necessary') {
      necessary += record.amount;
    } else if (record.category === 'useful') {
      useful += record.amount;
    } else if (record.category === 'investments') {
      investments += record.amount;
    } else {
      harmful += record.amount;
    }
  }
  return { necessary, useful, investments, harmful };
}
