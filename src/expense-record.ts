import type { ExpenseCategory } from './expense-category';

export interface ExpenseRecord {
  readonly id: string;
  readonly amount: number;
  readonly description: string;
  readonly category: ExpenseCategory;
  readonly createdAt: string;
}
