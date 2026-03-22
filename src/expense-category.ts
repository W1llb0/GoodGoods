export type ExpenseCategory = 'necessary' | 'useful' | 'investments' | 'harmful';

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  necessary: 'Необходимое',
  useful: 'Полезное',
  investments: 'Инвестиции',
  harmful: 'Вредные',
};

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (
    value === 'necessary' || value === 'useful' || value === 'investments' || value === 'harmful'
  );
}
