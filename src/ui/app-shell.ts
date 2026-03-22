import { CATEGORY_LABEL, isExpenseCategory, type ExpenseCategory } from '../expense-category';
import { createExpenseId } from '../create-expense-id';
import type { ExpenseRecord } from '../expense-record';
import { parseExpenseFields } from '../expense-parser';
import { computeDistributionHealth } from '../distribution-health';
import { computeCategoryTotals } from '../expense-stats';
import { expenseStorage } from '../expense-storage';
import { formatDateTime } from '../format-datetime';
import { formatMoneyRuble } from '../format-money';

const BUCKET_CHIP_CLASS: Record<ExpenseCategory, string> = {
  necessary: 'chip chip--nec',
  useful: 'chip chip--use',
  investments: 'chip chip--inv',
  harmful: 'chip chip--harm',
};

function parseSelectedCategory(form: HTMLFormElement): ExpenseCategory | null {
  const checked: HTMLInputElement | null = form.querySelector(
    'input[name="expense-category"]:checked',
  );
  if (checked === null) {
    return null;
  }
  if (isExpenseCategory(checked.value)) {
    return checked.value;
  }
  return null;
}

function chipSvg(bucket: ExpenseCategory): string {
  if (bucket === 'harmful') {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z"/></svg>';
  }
  if (bucket === 'investments') {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 17h2v-7H3v7Zm4 0h2V7H7v10Zm4 0h2v-4h-2v4Zm4 0h2V9h-2v8Zm4 0h2v-5h-2v5Z"/></svg>';
  }
  if (bucket === 'useful') {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3l7 4v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V7l7-4Z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Zm0 9.5A2.5 2.5 0 1 0 12 7a2.5 2.5 0 0 0 0 4.5Z"/></svg>';
}

function statIconSvg(kind: 'nec' | 'use' | 'inv' | 'harm'): string {
  if (kind === 'harm') {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z"/></svg>';
  }
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
      </div>
      <div class="topbar__aside">
        <div class="topbar__tools">
          <button class="linkbtn topbar__tool" type="button" id="export-json" title="Сохранить данные в JSON">Экспорт</button>
          <button class="linkbtn topbar__tool" type="button" id="import-json" title="Загрузить из JSON">Импорт</button>
          <input class="sr-only" id="import-file" type="file" accept="application/json,.json" />
        </div>
        <div class="pill" title="Локальное сохранение">
          <span class="pill__dot" aria-hidden="true"></span>
          <span>Офлайн · браузер</span>
        </div>
      </div>
    </header>

    <section class="hero" aria-label="Всего трат">
      <div class="hero__inner">
        <div class="hero__label">
          <div class="hero__kicker">Сводка</div>
          <div class="hero__badge">Всего</div>
        </div>
        <div class="hero__amount" id="hero-total">0 ₽</div>
        <p class="hero__hint">Сумма всех трат по журналу.</p>
      </div>
    </section>

    <section class="health-strip health-strip--empty" aria-label="Оценка распределения трат">
      <div class="health-strip__head">
        <div class="health-strip__intro">
          <div class="health-strip__kicker">Баланс трат</div>
          <h2 class="health-strip__title" id="health-label">Нет данных</h2>
        </div>
        <div class="health-strip__score-block" id="health-score-block" aria-hidden="true">
          <div class="health-strip__score" id="health-score">—</div>
          <div class="health-strip__score-note">из 100</div>
        </div>
      </div>
      <p class="health-strip__meta" id="health-meta">Добавьте траты, чтобы увидеть полоску и оценку.</p>
      <div
        class="stack-bar"
        id="health-stack"
        role="img"
        aria-label="Распределение суммы по категориям"
      ></div>
      <p class="health-strip__hint" id="health-hint"></p>
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
      <article class="stat stat--harm">
        <div class="stat__head">
          <div class="stat__name">Вредные</div>
          <div class="stat__icon" aria-hidden="true">${statIconSvg('harm')}</div>
        </div>
        <div class="stat__value" id="stat-harmful">0 ₽</div>
      </article>
    </div>

    <section class="panel" aria-label="Журнал трат">
      <div class="panel__header">
        <h2 class="panel__title">Журнал</h2>
        <div class="panel__meta"><span id="feed-count">0</span> записей</div>
      </div>
      <ul class="feed" id="feed"></ul>
    </section>

    <button class="fab" type="button" id="open-expense-modal" aria-haspopup="dialog" aria-controls="expense-modal">
      <span class="fab__plus" aria-hidden="true">+</span>
      <span class="fab__text">Новая трата</span>
    </button>

    <div class="modal" id="expense-modal" hidden role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
      <button type="button" class="modal__backdrop" id="expense-modal-backdrop" tabindex="-1" aria-label="Закрыть"></button>
      <div class="modal__panel">
        <div class="modal__head">
          <h2 class="modal__title" id="expense-modal-title">Новая трата</h2>
          <button type="button" class="modal__close" id="close-expense-modal" aria-label="Закрыть окно">×</button>
        </div>
        <form class="expense-form" id="expense-form" autocomplete="off">
          <div class="banner banner--error" id="error-banner" hidden></div>
          <div class="field field--amount">
            <label class="field__label" for="expense-amount">Сумма, ₽</label>
            <input
              class="input"
              id="expense-amount"
              name="amount"
              inputmode="decimal"
              enterkeyhint="next"
              placeholder="1200"
            />
          </div>
          <div class="field field--description">
            <label class="field__label" for="expense-description">Название</label>
            <input
              class="input"
              id="expense-description"
              name="description"
              inputmode="text"
              enterkeyhint="done"
              placeholder="Продукты, кофе…"
            />
          </div>
          <fieldset class="field field--category">
            <legend class="field__label">Тип траты</legend>
            <div class="category-grid" role="radiogroup" aria-label="Тип траты">
              <label class="category-tile category-tile--nec">
                <input class="category-tile__input" type="radio" name="expense-category" value="necessary" required />
                <span class="category-tile__face">Необходимое</span>
              </label>
              <label class="category-tile category-tile--use">
                <input class="category-tile__input" type="radio" name="expense-category" value="useful" />
                <span class="category-tile__face">Полезное</span>
              </label>
              <label class="category-tile category-tile--inv">
                <input class="category-tile__input" type="radio" name="expense-category" value="investments" />
                <span class="category-tile__face">Инвестиции</span>
              </label>
              <label class="category-tile category-tile--harm">
                <input class="category-tile__input" type="radio" name="expense-category" value="harmful" />
                <span class="category-tile__face">Вредное / лишнее</span>
              </label>
            </div>
          </fieldset>
          <div class="expense-form__actions">
            <button class="linkbtn expense-form__cancel" type="button" id="cancel-expense-modal">Отмена</button>
            <button class="btn expense-form__submit" type="submit" id="expense-submit">Записать</button>
          </div>
        </form>
      </div>
    </div>
  `;
  rootElement.appendChild(shell);
  const heroTotalEl: HTMLElement | null = shell.querySelector('#hero-total');
  const statNecessaryEl: HTMLElement | null = shell.querySelector('#stat-necessary');
  const statUsefulEl: HTMLElement | null = shell.querySelector('#stat-useful');
  const statInvestmentsEl: HTMLElement | null = shell.querySelector('#stat-investments');
  const statHarmfulEl: HTMLElement | null = shell.querySelector('#stat-harmful');
  const feedEl: HTMLUListElement | null = shell.querySelector('#feed');
  const feedCountEl: HTMLElement | null = shell.querySelector('#feed-count');
  const errorBannerEl: HTMLElement | null = shell.querySelector('#error-banner');
  const formEl: HTMLFormElement | null = shell.querySelector('#expense-form');
  const amountInputEl: HTMLInputElement | null = shell.querySelector('#expense-amount');
  const descriptionInputEl: HTMLInputElement | null = shell.querySelector('#expense-description');
  const modalEl: HTMLElement | null = shell.querySelector('#expense-modal');
  const openModalBtn: HTMLButtonElement | null = shell.querySelector('#open-expense-modal');
  const closeModalBtn: HTMLButtonElement | null = shell.querySelector('#close-expense-modal');
  const cancelModalBtn: HTMLButtonElement | null = shell.querySelector('#cancel-expense-modal');
  const modalBackdropEl: HTMLElement | null = shell.querySelector('#expense-modal-backdrop');
  const exportBtn: HTMLButtonElement | null = shell.querySelector('#export-json');
  const importBtn: HTMLButtonElement | null = shell.querySelector('#import-json');
  const importFileEl: HTMLInputElement | null = shell.querySelector('#import-file');
  if (
    heroTotalEl === null ||
    statNecessaryEl === null ||
    statUsefulEl === null ||
    statInvestmentsEl === null ||
    statHarmfulEl === null ||
    feedEl === null ||
    feedCountEl === null ||
    errorBannerEl === null ||
    formEl === null ||
    amountInputEl === null ||
    descriptionInputEl === null ||
    modalEl === null ||
    openModalBtn === null ||
    closeModalBtn === null ||
    cancelModalBtn === null ||
    modalBackdropEl === null ||
    exportBtn === null ||
    importBtn === null ||
    importFileEl === null
  ) {
    return;
  }
  const healthStripEl: HTMLElement | null = shell.querySelector('.health-strip');
  const healthLabelEl: HTMLElement | null = shell.querySelector('#health-label');
  const healthScoreEl: HTMLElement | null = shell.querySelector('#health-score');
  const healthScoreBlockEl: HTMLElement | null = shell.querySelector('#health-score-block');
  const healthMetaEl: HTMLElement | null = shell.querySelector('#health-meta');
  const healthStackEl: HTMLElement | null = shell.querySelector('#health-stack');
  const healthHintEl: HTMLElement | null = shell.querySelector('#health-hint');
  if (
    healthStripEl === null ||
    healthLabelEl === null ||
    healthScoreEl === null ||
    healthScoreBlockEl === null ||
    healthMetaEl === null ||
    healthStackEl === null ||
    healthHintEl === null
  ) {
    return;
  }
  const healthStripNode: HTMLElement = healthStripEl;
  const healthLabelNode: HTMLElement = healthLabelEl;
  const healthScoreNode: HTMLElement = healthScoreEl;
  const healthScoreBlockNode: HTMLElement = healthScoreBlockEl;
  const healthMetaNode: HTMLElement = healthMetaEl;
  const healthStackNode: HTMLElement = healthStackEl;
  const healthHintNode: HTMLElement = healthHintEl;
  const heroTotalNode: HTMLElement = heroTotalEl;
  const statNecessaryNode: HTMLElement = statNecessaryEl;
  const statUsefulNode: HTMLElement = statUsefulEl;
  const statInvestmentsNode: HTMLElement = statInvestmentsEl;
  const statHarmfulNode: HTMLElement = statHarmfulEl;
  const feedNode: HTMLUListElement = feedEl;
  const feedCountNode: HTMLElement = feedCountEl;
  const errorBannerNode: HTMLElement = errorBannerEl;
  const formNode: HTMLFormElement = formEl;
  const amountInputNode: HTMLInputElement = amountInputEl;
  const descriptionInputNode: HTMLInputElement = descriptionInputEl;
  const exportButton: HTMLButtonElement = exportBtn;
  const importButton: HTMLButtonElement = importBtn;
  const importFileInput: HTMLInputElement = importFileEl;
  const modalNode: HTMLElement = modalEl;
  const openModalButton: HTMLButtonElement = openModalBtn;
  const closeModalButton: HTMLButtonElement = closeModalBtn;
  const cancelModalButton: HTMLButtonElement = cancelModalBtn;
  let isExpenseModalOpen: boolean = false;
  function openExpenseModal(): void {
    isExpenseModalOpen = true;
    modalNode.hidden = false;
    document.body.style.overflow = 'hidden';
    amountInputNode.focus();
  }
  function closeExpenseModal(): void {
    isExpenseModalOpen = false;
    modalNode.hidden = true;
    document.body.style.overflow = '';
    setError(null);
    formNode.reset();
    openModalButton.focus();
  }
  function setError(message: string | null): void {
    if (message === null || message.length === 0) {
      errorBannerNode.hidden = true;
      errorBannerNode.textContent = '';
      return;
    }
    errorBannerNode.hidden = false;
    errorBannerNode.textContent = message;
  }
  function buildStackBarSegments(totals: {
    necessary: number;
    useful: number;
    investments: number;
    harmful: number;
  }): string {
    const segments: ReadonlyArray<{ readonly className: string; readonly amount: number }> = [
      { className: 'stack-bar__seg stack-bar__seg--nec', amount: totals.necessary },
      { className: 'stack-bar__seg stack-bar__seg--use', amount: totals.useful },
      { className: 'stack-bar__seg stack-bar__seg--inv', amount: totals.investments },
      { className: 'stack-bar__seg stack-bar__seg--harm', amount: totals.harmful },
    ];
    return segments
      .map(
        (seg) =>
          `<div class="${seg.className}" style="flex:${seg.amount} 1 0" aria-hidden="true"></div>`,
      )
      .join('');
  }
  function render(): void {
    const records: readonly ExpenseRecord[] = expenseStorage.loadExpenses();
    const totals = computeCategoryTotals(records);
    const totalAll: number = totals.necessary + totals.useful + totals.investments + totals.harmful;
    heroTotalNode.textContent = formatMoneyRuble(totalAll);
    statNecessaryNode.textContent = formatMoneyRuble(totals.necessary);
    statUsefulNode.textContent = formatMoneyRuble(totals.useful);
    statInvestmentsNode.textContent = formatMoneyRuble(totals.investments);
    statHarmfulNode.textContent = formatMoneyRuble(totals.harmful);
    const health = computeDistributionHealth(totals);
    if (health === null) {
      healthStripNode.classList.remove('health-strip--good', 'health-strip--caution', 'health-strip--risk');
      healthStripNode.classList.add('health-strip--empty');
      healthLabelNode.textContent = 'Нет данных';
      healthScoreNode.textContent = '—';
      healthMetaNode.textContent = 'Добавьте траты, чтобы увидеть полоску и оценку.';
      healthStackNode.innerHTML = '';
      healthStackNode.setAttribute('aria-label', 'Распределение по категориям: пока нет сумм');
      healthHintNode.textContent = '';
      healthScoreBlockNode.setAttribute('aria-hidden', 'true');
    } else {
      healthStripNode.classList.remove('health-strip--empty', 'health-strip--good', 'health-strip--caution', 'health-strip--risk');
      healthStripNode.classList.add(`health-strip--${health.tone}`);
      healthLabelNode.textContent = health.label;
      healthScoreNode.textContent = String(health.score);
      const harmfulPct: number = Math.round(health.harmfulShare * 100);
      const necPct: number = Math.round((totals.necessary / health.totalAmount) * 100);
      const usePct: number = Math.round((totals.useful / health.totalAmount) * 100);
      const invPct: number = Math.round((totals.investments / health.totalAmount) * 100);
      healthMetaNode.textContent = `Вредные: ${harmfulPct}% от суммы · балл выше, когда вредных меньше.`;
      healthStackNode.innerHTML = buildStackBarSegments(totals);
      healthStackNode.setAttribute(
        'aria-label',
        `Доли по сумме: необходимое ${necPct}%, полезное ${usePct}%, инвестиции ${invPct}%, вредные ${harmfulPct}%`,
      );
      healthHintNode.textContent = health.hint;
      healthScoreBlockNode.setAttribute('aria-hidden', 'false');
    }
    feedCountNode.textContent = String(records.length);
    feedNode.innerHTML = '';
    if (records.length === 0) {
      const empty: HTMLParagraphElement = document.createElement('p');
      empty.className = 'feed__empty';
      empty.textContent =
        'Пока пусто. Нажмите «Новая трату» внизу и добавьте сумму, название и тип.';
      feedNode.appendChild(empty);
      return;
    }
    const sorted: ExpenseRecord[] = [...records].sort((a: ExpenseRecord, b: ExpenseRecord) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    for (const record of sorted) {
      const li: HTMLLIElement = document.createElement('li');
      const bucket: ExpenseCategory = record.category;
      li.className = bucket === 'harmful' ? 'row row--harm pop' : 'row pop';
      const left: HTMLDivElement = document.createElement('div');
      const title: HTMLDivElement = document.createElement('div');
      title.className = 'row__title';
      title.textContent = record.description;
      const meta: HTMLDivElement = document.createElement('div');
      meta.className = 'row__meta';
      const chip: HTMLSpanElement = document.createElement('span');
      chip.className = BUCKET_CHIP_CLASS[bucket];
      chip.innerHTML = `${chipSvg(bucket)} ${CATEGORY_LABEL[bucket]}`;
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
    if (!formNode.reportValidity()) {
      return;
    }
    const parsed = parseExpenseFields(amountInputNode.value, descriptionInputNode.value);
    if (!parsed.ok) {
      setError(parsed.errorMessage);
      return;
    }
    const category: ExpenseCategory | null = parseSelectedCategory(formNode);
    if (category === null) {
      setError('Выберите тип траты.');
      return;
    }
    const record: ExpenseRecord = {
      id: createExpenseId(),
      amount: parsed.amount,
      description: parsed.description,
      category,
      createdAt: new Date().toISOString(),
    };
    const next: ExpenseRecord[] = [...expenseStorage.loadExpenses(), record];
    expenseStorage.saveExpenses(next);
    formNode.reset();
    closeExpenseModal();
    render();
  });
  openModalButton.addEventListener('click', () => {
    openExpenseModal();
  });
  closeModalButton.addEventListener('click', () => {
    closeExpenseModal();
  });
  cancelModalButton.addEventListener('click', () => {
    closeExpenseModal();
  });
  modalBackdropEl.addEventListener('click', () => {
    closeExpenseModal();
  });
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !isExpenseModalOpen) {
      return;
    }
    event.preventDefault();
    closeExpenseModal();
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
