import type { ExpenseCategory } from './expense-category';
import { expenseRules } from './expense-rules';

function normalizeText(text: string): string {
  return text.toLowerCase().replaceAll('ё', 'е').replace(/\s+/gu, ' ').trim();
}

function containsKeyword(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

function matchesAnyKeyword(normalized: string, keywords: readonly string[]): boolean {
  for (const keyword of keywords) {
    if (containsKeyword(normalized, keyword)) {
      return true;
    }
  }
  return false;
}

function matchesInvestmentRegex(normalized: string): boolean {
  for (const regex of expenseRules.investmentRegexes) {
    if (regex.test(normalized)) {
      return true;
    }
  }
  return false;
}

function isHomeCoffeeException(normalized: string): boolean {
  if (!normalized.includes('кофе')) {
    return false;
  }
  return (
    normalized.includes('дом') ||
    normalized.includes('зерно') ||
    normalized.includes('молот') ||
    normalized.includes('для дома')
  );
}

/**
 * Order: investments → harmful signals → necessary → useful → default harmful.
 */
export function categorizeExpense(description: string): ExpenseCategory {
  const normalized: string = normalizeText(description);
  if (matchesInvestmentRegex(normalized) || matchesAnyKeyword(normalized, expenseRules.investmentKeywords)) {
    return 'investments';
  }
  if (isHomeCoffeeException(normalized)) {
    return 'necessary';
  }
  if (matchesAnyKeyword(normalized, expenseRules.harmfulKeywords)) {
    return 'harmful';
  }
  if (matchesAnyKeyword(normalized, expenseRules.necessaryKeywords)) {
    return 'necessary';
  }
  if (matchesAnyKeyword(normalized, expenseRules.usefulKeywords)) {
    return 'useful';
  }
  return 'harmful';
}
