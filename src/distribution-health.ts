type DistributionHealthTone = 'good' | 'caution' | 'risk';

type DistributionHealth = Readonly<{
  totalAmount: number;
  harmfulShare: number;
  score: number;
  tone: DistributionHealthTone;
  label: string;
  hint: string;
}>;

/**
 * Derives a 0–100 balance score from category totals: higher means a smaller share of harmful spending.
 */
export function computeDistributionHealth(
  totals: Readonly<{
    necessary: number;
    useful: number;
    investments: number;
    harmful: number;
  }>,
): DistributionHealth | null {
  const totalAmount: number =
    totals.necessary + totals.useful + totals.investments + totals.harmful;
  if (totalAmount <= 0) {
    return null;
  }
  const harmfulShare: number = totals.harmful / totalAmount;
  const score: number = Math.round(100 * (1 - harmfulShare));
  let tone: DistributionHealthTone;
  let label: string;
  let hint: string;
  if (harmfulShare <= 0.12) {
    tone = 'good';
    label = 'Распределение спокойное';
    hint = 'Доля вредных трат небольшая — импульсы под контролем.';
  } else if (harmfulShare <= 0.3) {
    tone = 'caution';
    label = 'Заметная доля вредных';
    hint = 'Часть бюджета уходит во вредное; полоска показывает масштаб.';
  } else {
    tone = 'risk';
    label = 'Много вредных трат';
    hint = 'Существенная доля уходит во вредное — хорошо видно на шкале и в сумме выше.';
  }
  return { totalAmount, harmfulShare, score, tone, label, hint };
}
