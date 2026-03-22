import { categorizeExpense } from '../expense-categorizer';
import type { ExpenseCategory } from '../expense-category';
import { createExpenseId } from '../create-expense-id';
import type { ExpenseRecord } from '../expense-record';
import { parseExpenseString } from '../expense-parser';
import { computeCategoryTotals } from '../expense-stats';
import { expenseStorage } from '../expense-storage';
import { formatDateTime } from '../format-datetime';
import { formatMoneyRuble } from '../format-money';

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  necessary: 'Необходимое',
  useful: 'Полезное',
  investments: 'Инвестиции',
  harmful: 'Вредные',
};

const CATEGORY_CHIP_CLASS: Record<ExpenseCategory, string> = {
  necessary: 'chip chip--nec',
  useful: 'chip chip--use',
  investments: 'chip chip--inv',
  harmful: 'chip chip--harm',
};

function chipSvg(category: ExpenseCategory): string {
  if (category === 'harmful') {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z"/></svg>';
  }
  if (category === 'investments') {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 17h2v-7H3v7Zm4 0h2V7H7v10Zm4 0h2v-4h-2v4Zm4 0h2V9h-2v8Zm4 0h2v-5h-2v5Z"/></svg>';
  }
  if (category === 'useful') {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3l7 4v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V7l7-4Z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Zm0 9.5A2.5 2.5 0 1 0 12 7a2.5 2.5 0 0 0 0 4.5Z"/></svg>';
}

function totalIconSvg(): string {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 2v8h16V8H4Zm4 2h8v4H8v-4Z"/></svg>';
}

function statIconSvg(kind: 'nec' | 'use' | 'inv'): string {
  if (kind === 'inv') {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 19h16v2H4v-2Zm3-4h10v2H7v-2Zm-3-8h16v6H4v-6Zm2 2v2h12v-2H6Z"/></svg>';
  }
  if (kind === 'use') {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2l3 6 6 .9-4.5 4.4L18 20l-6-3.2L6 20l1.5-6.7L3 8.9 9 8z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9Zm0 16c3.86 0 7-3.14 7-7s-3.14-7-7-7-7 3.14-7 7 3.14 7 7 7Zm-1-11h2v6h-2V8Zm0 8h2v2h-2v-2Z"/></svg>';
}

export function mountApp(rootElement: HTMLElement): void {
  rootElement.innerHTML = '';
  const shell: HTMLDivElement = document.createElement('div');
  shell.className = 'app';
  shell.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <h1 class="brand__title">GoodGoods</h1>
        <p class="brand__subtitle">Книга трат в стиле квеста: введите сумму и смысл — мы разложим по категориям и покажем, где «утекают» монеты.</p>
      </div>
      <div class="pill" title="Локальное сохранение">
        <span class="pill__dot" aria-hidden="true"></span>
        <span>Офлайн · браузер</span>
      </div>
    </header>

    <section class="hero" aria-label="Вредные траты">
      <div class="hero__inner">
        <div class="hero__label">
          <div class="hero__kicker">Босс-уровень</div>
          <div class="hero__badge">Вредные траты</div>
        </div>
        <div class="hero__amount" id="harmful-total">0 ₽</div>
        <p class="hero__hint" id="harmful-hint">Строгие правила: всё неоднозначное попадает сюда. Цель — увидеть реальную «цену импульса».</p>
      </div>
    </section>

    <div class="grid" aria-label="Сводка по категориям">
      <article class="stat stat--nec">
        <div class="stat__head">
          <div class="stat__name">Необходимое</div>
          <div class="stat__icon" aria-hidden="true">${statIconSvg('nec')}</div>
        </div>
        <div class="stat__value" id="stat-necessary">0 ₽</div>
      </article>
      <article class="stat stat--use">
        <div class="stat__head">
          <div class="stat__name">Полезное</div>
          <div class="stat__icon" aria-hidden="true">${statIconSvg('use')}</div>
        </div>
        <div class="stat__value" id="stat-useful">0 ₽</div>
      </article>
      <article class="stat stat--inv">
        <div class="stat__head">
          <div class="stat__name">Инвестиции</div>
          <div class="stat__icon" aria-hidden="true">${statIconSvg('inv')}</div>
        </div>
        <div class="stat__value" id="stat-investments">0 ₽</div>
      </article>
      <article class="stat stat--inv">
        <div class="stat__head">
          <div class="stat__name">Всего</div>
          <div class="stat__icon" aria-hidden="true">${totalIconSvg()}</div>
        </div>
        <div class="stat__value" id="stat-total">0 ₽</div>
      </article>
    </div>

    <section class="panel" aria-label="Журнал трат">
      <div class="panel__header">
        <h2 class="panel__title">Журнал</h2>
        <div class="panel__meta"><span id="feed-count">0</span> записей</div>
      </div>
      <ul class="feed" id="feed"></ul>
    </section>

    <div class="composer" role="region" aria-label="Добавить трату">
      <div class="composer__inner">
        <div class="banner banner--error" id="error-banner" hidden></div>
        <form class="composer__row" id="expense-form" autocomplete="off">
          <div class="field">
            <label class="field__label" for="expense-input">Сумма и описание</label>
            <input class="input" id="expense-input" name="expense" inputmode="text" placeholder="Например: 1200 продукты или 450 кофе" />
          </div>
          <button class="btn" type="submit" id="expense-submit">Записать</button>
        </form>
        <div class="toolbar">
          <button class="linkbtn" type="button" id="export-json">Экспорт JSON</button>
          <button class="linkbtn" type="button" id="import-json">Импорт JSON</button>
          <input class="sr-only" id="import-file" type="file" accept="application/json,.json" />
        </div>
      </div>
    </div>
  `;
  rootElement.appendChild(shell);
  const harmfulTotalEl: HTMLElement | null = shell.querySelector('#harmful-total');
  const statNecessaryEl: HTMLElement | null = shell.querySelector('#stat-necessary');
  const statUsefulEl: HTMLElement | null = shell.querySelector('#stat-useful');
  const statInvestmentsEl: HTMLElement | null = shell.querySelector('#stat-investments');
  const statTotalEl: HTMLElement | null = shell.querySelector('#stat-total');
  const feedEl: HTMLUListElement | null = shell.querySelector('#feed');
  const feedCountEl: HTMLElement | null = shell.querySelector('#feed-count');
  const errorBannerEl: HTMLElement | null = shell.querySelector('#error-banner');
  const formEl: HTMLFormElement | null = shell.querySelector('#expense-form');
  const inputEl: HTMLInputElement | null = shell.querySelector('#expense-input');
  const exportBtn: HTMLButtonElement | null = shell.querySelector('#export-json');
  const importBtn: HTMLButtonElement | null = shell.querySelector('#import-json');
  const importFileEl: HTMLInputElement | null = shell.querySelector('#import-file');
  if (
    harmfulTotalEl === null ||
    statNecessaryEl === null ||
    statUsefulEl === null ||
    statInvestmentsEl === null ||
    statTotalEl === null ||
    feedEl === null ||
    feedCountEl === null ||
    errorBannerEl === null ||
    formEl === null ||
    inputEl === null ||
    exportBtn === null ||
    importBtn === null ||
    importFileEl === null
  ) {
    return;
  }
  const harmfulTotalNode: HTMLElement = harmfulTotalEl;
  const statNecessaryNode: HTMLElement = statNecessaryEl;
  const statUsefulNode: HTMLElement = statUsefulEl;
  const statInvestmentsNode: HTMLElement = statInvestmentsEl;
  const statTotalNode: HTMLElement = statTotalEl;
  const feedNode: HTMLUListElement = feedEl;
  const feedCountNode: HTMLElement = feedCountEl;
  const errorBannerNode: HTMLElement = errorBannerEl;
  const formNode: HTMLFormElement = formEl;
  const inputNode: HTMLInputElement = inputEl;
  const exportButton: HTMLButtonElement = exportBtn;
  const importButton: HTMLButtonElement = importBtn;
  const importFileInput: HTMLInputElement = importFileEl;
  function setError(message: string | null): void {
    if (message === null || message.length === 0) {
      errorBannerNode.hidden = true;
      errorBannerNode.textContent = '';
      return;
    }
    errorBannerNode.hidden = false;
    errorBannerNode.textContent = message;
  }
  function render(): void {
    const records: readonly ExpenseRecord[] = expenseStorage.loadExpenses();
    const totals = computeCategoryTotals(records);
    harmfulTotalNode.textContent = formatMoneyRuble(totals.harmful);
    statNecessaryNode.textContent = formatMoneyRuble(totals.necessary);
    statUsefulNode.textContent = formatMoneyRuble(totals.useful);
    statInvestmentsNode.textContent = formatMoneyRuble(totals.investments);
    const totalAll: number = totals.necessary + totals.useful + totals.investments + totals.harmful;
    statTotalNode.textContent = formatMoneyRuble(totalAll);
    feedCountNode.textContent = String(records.length);
    feedNode.innerHTML = '';
    if (records.length === 0) {
      const empty: HTMLParagraphElement = document.createElement('p');
      empty.className = 'feed__empty';
      empty.textContent =
        'Пока пусто. Добавьте первую строку: число + текст. Мы строго отнесём неясное к вредным тратам — это часть дизайна.';
      feedNode.appendChild(empty);
      return;
    }
    const sorted: ExpenseRecord[] = [...records].sort((a: ExpenseRecord, b: ExpenseRecord) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    for (const record of sorted) {
      const li: HTMLLIElement = document.createElement('li');
      li.className = 'row pop';
      const left: HTMLDivElement = document.createElement('div');
      const title: HTMLDivElement = document.createElement('div');
      title.className = 'row__title';
      title.textContent = record.description;
      const meta: HTMLDivElement = document.createElement('div');
      meta.className = 'row__meta';
      const chip: HTMLSpanElement = document.createElement('span');
      chip.className = CATEGORY_CHIP_CLASS[record.category];
      chip.innerHTML = `${chipSvg(record.category)} ${CATEGORY_LABEL[record.category]}`;
      const time: HTMLSpanElement = document.createElement('span');
      time.textContent = formatDateTime(record.createdAt);
      meta.appendChild(chip);
      meta.appendChild(time);
      left.appendChild(title);
      left.appendChild(meta);
      const amount: HTMLDivElement = document.createElement('div');
      amount.className = 'row__amount';
      amount.textContent = formatMoneyRuble(record.amount);
      li.appendChild(left);
      li.appendChild(amount);
      feedNode.appendChild(li);
    }
  }
  formNode.addEventListener('submit', (event: Event) => {
    event.preventDefault();
    setError(null);
    const raw: string = inputNode.value;
    const parsed = parseExpenseString(raw);
    if (!parsed.ok) {
      setError(parsed.errorMessage);
      return;
    }
    const category: ExpenseCategory = categorizeExpense(parsed.description);
    const record: ExpenseRecord = {
      id: createExpenseId(),
      amount: parsed.amount,
      description: parsed.description,
      category,
      createdAt: new Date().toISOString(),
    };
    const next: ExpenseRecord[] = [...expenseStorage.loadExpenses(), record];
    expenseStorage.saveExpenses(next);
    inputNode.value = '';
    render();
  });
  exportButton.addEventListener('click', () => {
    setError(null);
    const blob: Blob = new Blob([expenseStorage.exportJson()], { type: 'application/json;charset=utf-8' });
    const url: string = URL.createObjectURL(blob);
    const anchor: HTMLAnchorElement = document.createElement('a');
    anchor.href = url;
    anchor.download = `good-goods-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.rel = 'noopener';
    anchor.click();
    URL.revokeObjectURL(url);
  });
  importButton.addEventListener('click', () => {
    setError(null);
    importFileInput.click();
  });
  importFileInput.addEventListener('change', async () => {
    const file: File | undefined = importFileInput.files?.[0];
    if (file === undefined) {
      return;
    }
    try {
      const text: string = await file.text();
      const result = expenseStorage.importJson(text);
      if (!result.ok) {
        setError(result.errorMessage);
        return;
      }
      render();
    } catch {
      setError('Не удалось прочитать файл.');
    } finally {
      importFileInput.value = '';
    }
  });
  render();
}
