import { getNextSubmission, formatDateGMT7 } from '../deadline-utils.js';
import { ROUTES } from '../routes.js';

export function createEditionCard(edition, { now = Date.now(), showDeadline = true } = {}) {
  const card = document.createElement('article');
  card.className = 'card edition-card';

  const heading = document.createElement('h2');
  heading.className = 'edition-card__title';
  const link = document.createElement('a');
  link.href = `${ROUTES.conference}?id=${encodeURIComponent(edition.id)}`;
  link.textContent = `${edition.acronym || 'Hội nghị'} ${edition.year || ''}`.trim();
  heading.append(link);

  const name = document.createElement('p');
  name.className = 'edition-card__name';
  name.textContent = edition.name || 'Chưa có tên đầy đủ';

  const meta = document.createElement('p');
  meta.className = 'edition-card__meta';
  meta.textContent = [edition.format, edition.place].filter(Boolean).join(' · ') || 'Chưa xác định hình thức';

  card.append(heading, name, meta);

  if (showDeadline) {
    const submission = getNextSubmission(edition, { now });
    const deadline = document.createElement('p');
    deadline.className = 'edition-card__deadline';
    if (submission.deadline?.instant) {
      deadline.textContent = `Hạn tiếp theo: ${formatDateGMT7(submission.deadline.instant)}`;
    } else {
      deadline.textContent = submission.status === 'closed' ? 'Đã hết hạn' : 'Chưa có hạn chính xác';
    }
    card.append(deadline);
  }

  return card;
}
