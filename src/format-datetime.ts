export function formatDateTime(iso: string): string {
  const date: Date = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
