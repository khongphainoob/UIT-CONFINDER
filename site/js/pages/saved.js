import { initCommonUI } from '../common.js';
import { getCatalog } from '../data-service.js';
import { ROUTES } from '../routes.js';
import { getSavedIds, toggleSaved } from '../saved-store.js';
import { showState } from '../ui/state.js';

initCommonUI('saved');

const host = document.querySelector('#page-content');
let currentCatalog = { editions: [] };

function renderWarning(message) {
  const warning = document.createElement('p');
  warning.className = 'notice notice--warning';
  warning.setAttribute('role', 'alert');
  warning.textContent = message;
  host.prepend(warning);
}

function createEditionCard(edition) {
  const card = document.createElement('article');
  card.className = 'saved-card card';
  const heading = document.createElement('h2');
  heading.className = 'saved-card__title';
  heading.textContent = edition.name;
  const meta = document.createElement('p');
  meta.className = 'saved-card__meta';
  meta.textContent = `${edition.acronym} · ${edition.year} · ${edition.format ?? 'Chưa xác định'}`;
  const link = document.createElement('a');
  link.href = `${ROUTES.conference}?id=${encodeURIComponent(edition.id)}`;
  link.textContent = 'Xem chi tiết';
  link.className = 'button button--secondary';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'button button--danger';
  remove.textContent = 'Bỏ lưu';
  remove.addEventListener('click', () => {
    const result = toggleSaved(edition.id);
    if (!result.ok) {
      renderWarning(result.error);
      return;
    }
    renderSaved(result.ids, currentCatalog);
  });
  const actions = document.createElement('div');
  actions.className = 'saved-card__actions';
  actions.append(link, remove);
  card.append(heading, meta, actions);
  return card;
}

function renderSaved(ids, catalog) {
  const savedEditions = catalog.editions.filter((edition) => ids.includes(edition.id));
  const missingCount = ids.length - savedEditions.length;
  const content = document.createDocumentFragment();
  const summary = document.createElement('p');
  summary.className = 'saved-summary';
  summary.textContent = `${savedEditions.length} hội nghị đã lưu`;
  content.append(summary);
  if (missingCount > 0) {
    const warning = document.createElement('p');
    warning.className = 'notice notice--warning';
    warning.setAttribute('role', 'alert');
    warning.textContent = `${missingCount} mục đã lưu không còn trong catalog.`;
    content.append(warning);
  }
  if (savedEditions.length === 0) {
    const empty = document.createElement('section');
    empty.className = 'state';
    const title = document.createElement('h2');
    title.textContent = 'Chưa có hội nghị đã lưu';
    const message = document.createElement('p');
    message.textContent = 'Lưu một hội nghị từ trang Khám phá để xem lại ở đây.';
    empty.append(title, message);
    content.append(empty);
  } else {
    const list = document.createElement('div');
    list.className = 'saved-list';
    savedEditions.forEach((edition) => list.append(createEditionCard(edition)));
    content.append(list);
  }
  host.replaceChildren(content);
}

async function initPage() {
  showState(host, { kind: 'loading', title: 'Đang tải danh sách', message: 'Vui lòng chờ.' });
  const saved = getSavedIds();
  try {
    currentCatalog = await getCatalog();
    renderSaved(saved.ids, currentCatalog);
    if (!saved.ok) renderWarning(saved.error);
  } catch (error) {
    showState(host, { kind: 'error', title: 'Không tải được dữ liệu', message: error.message });
  }
}

window.addEventListener('saved:changed', (event) => {
  renderSaved(event.detail.ids, currentCatalog);
});

initPage();
