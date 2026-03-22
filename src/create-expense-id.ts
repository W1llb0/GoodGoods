export function createExpenseId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}
