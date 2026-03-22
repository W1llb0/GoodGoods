import type { ParseExpenseResult } from './parse-expense-result';

const AMOUNT_PATTERN: RegExp = /(-?\d[\d\s]*(?:[.,]\d+)?)/u;

export function parseExpenseString(rawInput: string): ParseExpenseResult {
  const trimmed: string = rawInput.trim();
  if (trimmed.length === 0) {
    return { ok: false, errorMessage: 'Введите сумму и короткое описание, например: 450 кофе или 1500 продукты.' };
  }
  const match: RegExpMatchArray | null = trimmed.match(AMOUNT_PATTERN);
  if (match === null || match.index === undefined) {
    return { ok: false, errorMessage: 'Не найдена сумма. Добавьте число, например: 1200 обед.' };
  }
  const rawNumber: string = match[1].replace(/\s/g, '').replace(',', '.');
  const amount: number = Number.parseFloat(rawNumber);
  if (Number.isNaN(amount) || amount <= 0) {
    return { ok: false, errorMessage: 'Сумма должна быть положительным числом.' };
  }
  const before: string = trimmed.slice(0, match.index).trim();
  const after: string = trimmed.slice(match.index + match[0].length).trim();
  const joined: string = [before, after].filter((part: string) => part.length > 0).join(' ');
  const description: string = joined.replace(/^[,.\s]+|[,.\s]+$/gu, '').trim();
  if (description.length === 0) {
    return { ok: false, errorMessage: 'Добавьте текст после суммы, чтобы понять категорию траты.' };
  }
  return { ok: true, amount, description };
}
