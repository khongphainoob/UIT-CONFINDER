import { initCommonUI, createIcon } from '../common.js';
import { getCatalog } from '../data-service.js';
import {
  getNextSubmission,
  getUrgencyInfo,
  getCountdownText,
  formatTimeGMT7,
  formatDateGMT7,
} from '../deadline-utils.js';
import { showState } from '../ui/state.js';

// Khởi tạo shell giao diện chung (header, footer, nav)
initCommonUI('detail');

const host = document.querySelector('#page-content');

/**
 * Bản đồ tên viết tắt sang tên đầy đủ các lĩnh vực nghiên cứu
 */
const FIELD_NAMES = {
  AI: 'Trí tuệ nhân tạo (AI)',
  SE: 'Kỹ thuật phần mềm (SE)',
  DB: 'Cơ sở dữ liệu (DB)',
  NW: 'Mạng máy tính (NW)',
  SC: 'Hệ thống máy tính (SC)',
  HI: 'Tương tác người - máy (HCI)',
  CG: 'Đồ họa & Đa phương tiện (CG)',
  MX: 'Đa ngành & Ứng dụng (MX)',
  CT: 'Lý thuyết khoa học máy tính (CT)',
  DS: 'An toàn thông tin (DS)',
};

/**
 * Bản đồ nhãn tiếng Việt cho các loại deadline
 */
const DEADLINE_TYPE_LABELS = {
  abstract: 'Hạn nộp tóm tắt (Abstract)',
  paper: 'Hạn nộp toàn văn (Paper)',
  rebuttal: 'Thời gian phản biện (Rebuttal)',
  decision: 'Thông báo kết quả (Decision)',
  opening: 'Khai mạc hội nghị (Opening)',
};

/**
 * Bản đồ icon tương ứng cho các loại deadline
 */
const DEADLINE_TYPE_ICONS = {
  abstract: 'calendar',
  paper: 'calendar',
  rebuttal: 'refresh',
  decision: 'check-circle',
  opening: 'clock',
};

/**
 * Tạo phần tử ruy-băng xếp hạng CORE/CCF
 * @param {'ccf'|'core'} system
 * @param {string} val
 * @returns {HTMLElement}
 */
function createRibbonBadge(system, val) {
  const span = document.createElement('span');
  const upper = String(val).toUpperCase();

  if (system === 'core') {
    if (upper === 'A*') {
      span.className = 'ribbon ribbon--core-a-star';
      span.textContent = 'CORE A*';
    } else if (upper === 'A') {
      span.className = 'ribbon ribbon--a';
      span.textContent = 'CORE A';
    } else if (upper === 'B') {
      span.className = 'ribbon ribbon--b';
      span.textContent = 'CORE B';
    } else {
      span.className = 'ribbon ribbon--c';
      span.textContent = `CORE ${upper}`;
    }
  } else {
    // CCF
    if (upper === 'A') {
      span.className = 'ribbon ribbon--a';
      span.textContent = 'CCF A';
    } else if (upper === 'B') {
      span.className = 'ribbon ribbon--b';
      span.textContent = 'CCF B';
    } else {
      span.className = 'ribbon ribbon--c';
      span.textContent = `CCF ${upper}`;
    }
  }
  return span;
}

/**
 * Tạo nhãn chất lượng dữ liệu (Verified, Unverified, Estimated, TBA)
 * @param {'verified'|'unverified'|'estimated'|'tba'} quality
 * @returns {HTMLElement}
 */
function createQualityBadge(quality) {
  const span = document.createElement('span');
  span.className = `quality quality--${quality || 'unverified'}`;

  let iconName = 'help';
  let text = 'Chưa đối chiếu';

  if (quality === 'verified') {
    iconName = 'check';
    text = 'Verified';
  } else if (quality === 'estimated') {
    iconName = 'approx';
    text = 'Estimated';
  } else if (quality === 'tba') {
    iconName = 'pause';
    text = 'TBA';
  }

  span.append(createIcon(iconName), text);
  return span;
}

/**
 * Tạo khối hero tổng quan hội nghị
 * @param {object} edition
 * @returns {HTMLElement}
 */
function renderHero(edition) {
  const hero = document.createElement('article');
  hero.className = 'detail-hero';

  const header = document.createElement('div');
  header.className = 'detail-hero__header';

  // Tiêu đề Acronym + Năm
  const titleRow = document.createElement('div');
  titleRow.className = 'detail-hero__title-row';

  const title = document.createElement('h1');
  title.className = 'detail-hero__acronym';
  title.textContent = edition.acronym || 'Hội nghị';
  titleRow.append(title);

  if (edition.year) {
    const year = document.createElement('span');
    year.className = 'detail-hero__year';
    year.textContent = String(edition.year);
    titleRow.append(year);
  }
  header.append(titleRow);

  // Tên đầy đủ
  if (edition.name) {
    const fullName = document.createElement('p');
    fullName.className = 'detail-hero__fullname';
    fullName.textContent = edition.name;
    header.append(fullName);
  }

  // Meta: ribbons, tags, địa điểm
  const metaRow = document.createElement('div');
  metaRow.className = 'detail-hero__meta';

  // Ruy-băng xếp hạng
  if (edition.ranks?.core) {
    metaRow.append(createRibbonBadge('core', edition.ranks.core));
  }
  if (edition.ranks?.ccf) {
    metaRow.append(createRibbonBadge('ccf', edition.ranks.ccf));
  }

  // Lĩnh vực
  if (Array.isArray(edition.fields)) {
    for (const f of edition.fields) {
      const tag = document.createElement('span');
      tag.className = 'detail-tag';
      tag.textContent = FIELD_NAMES[f] || f;
      metaRow.append(tag);
    }
  }

  // Hình thức và địa điểm
  if (edition.format || edition.place) {
    const placeTag = document.createElement('span');
    placeTag.className = 'detail-tag';
    const placeText = [edition.format, edition.place].filter(Boolean).join(' · ');
    placeTag.textContent = placeText;
    metaRow.append(placeTag);
  }

  header.append(metaRow);
  hero.append(header);

  // Hàng hành động CTA: Website, Lưu, Lịch
  const actionsRow = document.createElement('div');
  actionsRow.className = 'detail-hero__actions';

  // 1. Link trang chủ chính thức
  if (edition.websiteUrl && (edition.websiteUrl.startsWith('http://') || edition.websiteUrl.startsWith('https://'))) {
    const siteLink = document.createElement('a');
    siteLink.className = 'button button--outline';
    siteLink.href = edition.websiteUrl;
    siteLink.target = '_blank';
    siteLink.rel = 'noopener noreferrer';
    siteLink.append('Trang chính thức ', createIcon('ext'));
    actionsRow.append(siteLink);
  }

  // 2. Nút Lưu hội nghị (kết nối SavedStore hoặc thông báo sẵn sàng)
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'button button--outline';
  saveBtn.setAttribute('aria-pressed', 'false');

  // Thử kiểm tra trạng thái lưu nếu TV4 đã có saved-store
  import('../saved-store.js')
    .then(({ getSavedIds, toggleSaved }) => {
      try {
        const { ok, ids } = getSavedIds();
        if (ok && Array.isArray(ids) && ids.includes(edition.id)) {
          saveBtn.setAttribute('aria-pressed', 'true');
          saveBtn.replaceChildren(createIcon('star'), ' Đã lưu');
        } else {
          saveBtn.replaceChildren(createIcon('star'), ' Lưu hội nghị');
        }
      } catch {
        saveBtn.replaceChildren(createIcon('star'), ' Lưu hội nghị');
      }

      saveBtn.addEventListener('click', () => {
        try {
          const res = toggleSaved(edition.id);
          if (res?.ok) {
            const isSaved = res.saved;
            saveBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
            saveBtn.replaceChildren(createIcon('star'), isSaved ? ' Đã lưu' : ' Lưu hội nghị');
          }
        } catch (err) {
          console.info('Module lưu hội nghị đang được hoàn thiện:', err.message);
        }
      });
    })
    .catch(() => {
      saveBtn.replaceChildren(createIcon('star'), ' Lưu hội nghị');
    });

  actionsRow.append(saveBtn);
  hero.append(actionsRow);

  return hero;
}

/**
 * Tạo khối hạn nộp tiếp theo nổi bật
 * @param {object} edition
 * @param {object} nextInfo
 * @param {number} now
 * @returns {HTMLElement}
 */
function renderNextSubmissionBox(edition, nextInfo, now) {
  const { status, deadline } = nextInfo;

  const box = document.createElement('section');
  box.className = `detail-highlight ${status === 'closed' ? 'detail-highlight--closed' : ''}`;
  box.setAttribute('aria-labelledby', 'highlight-title');

  const head = document.createElement('div');
  head.className = 'detail-highlight__head';

  const label = document.createElement('h2');
  label.id = 'highlight-title';
  label.className = 'detail-highlight__label';

  if (status === 'upcoming') {
    label.textContent = `Mốc tiếp theo · ${DEADLINE_TYPE_LABELS[deadline?.type] || 'Hạn nộp bài'}`;
  } else if (status === 'closed') {
    label.textContent = 'Tất cả các mốc nộp bài đã kết thúc';
  } else {
    label.textContent = 'Mốc nộp bài cần đối chiếu';
  }
  head.append(label);

  // Nhãn chất lượng dữ liệu
  if (deadline?.quality) {
    head.append(createQualityBadge(deadline.quality));
  }
  box.append(head);

  const body = document.createElement('div');
  body.className = 'detail-highlight__body';

  // Countdown & Urgency
  const countdownWrap = document.createElement('div');
  countdownWrap.className = 'detail-highlight__countdown-wrap';

  if (deadline?.instant) {
    const targetTime = Date.parse(deadline.instant);
    const urgency = getUrgencyInfo(targetTime, now);

    const urgencyBadge = document.createElement('span');
    urgencyBadge.className = `urgency ${urgency.className}`;
    urgencyBadge.append(createIcon(urgency.icon), urgency.label);
    countdownWrap.append(urgencyBadge);

    const countdownText = document.createElement('span');
    countdownText.className = 'detail-highlight__countdown';
    countdownText.textContent = getCountdownText(targetTime, now);
    countdownWrap.append(countdownText);
  } else {
    const urgencyBadge = document.createElement('span');
    urgencyBadge.className = 'urgency urgency--open';
    urgencyBadge.append(createIcon('pause'), deadline?.sourceText || 'Chưa công bố');
    countdownWrap.append(urgencyBadge);
  }
  body.append(countdownWrap);

  // Bảng hiển thị giờ GMT+7 và Giờ nguồn
  const timesGrid = document.createElement('div');
  timesGrid.className = 'detail-times-grid';

  // Cột 1: Giờ quy đổi GMT+7
  const gmtCol = document.createElement('div');
  gmtCol.className = 'detail-time-col';
  const gmtLabel = document.createElement('span');
  gmtLabel.className = 'detail-time-col__label';
  gmtLabel.textContent = 'Giờ Việt Nam (GMT+7)';
  const gmtVal = document.createElement('span');
  gmtVal.className = 'detail-time-col__value';

  if (deadline?.instant) {
    gmtVal.textContent = `${formatTimeGMT7(deadline.instant)} · ${formatDateGMT7(deadline.instant)}`;
  } else {
    gmtVal.textContent = 'Chưa có giờ quy đổi chính xác';
  }
  gmtCol.append(gmtLabel, gmtVal);
  timesGrid.append(gmtCol);

  // Cột 2: Giờ gốc từ nguồn
  const srcCol = document.createElement('div');
  srcCol.className = 'detail-time-col';
  const srcLabel = document.createElement('span');
  srcLabel.className = 'detail-time-col__label';
  srcLabel.textContent = 'Giờ nguồn công bố';
  const srcVal = document.createElement('span');
  srcVal.className = 'detail-time-col__value';

  const tzSuffix = deadline?.timezone ? ` (${deadline.timezone})` : '';
  srcVal.textContent = `${deadline?.sourceText || 'TBA'}${tzSuffix}`;
  srcCol.append(srcLabel, srcVal);
  timesGrid.append(srcCol);

  body.append(timesGrid);
  box.append(body);

  return box;
}

/**
 * Tạo danh sách các vòng (Rounds & Timeline)
 * @param {object} edition
 * @param {number} now
 * @returns {HTMLElement}
 */
function renderRoundsSection(edition, now) {
  const section = document.createElement('section');
  section.className = 'detail-rounds';
  section.setAttribute('aria-labelledby', 'rounds-title');

  const title = document.createElement('h2');
  title.id = 'rounds-title';
  title.className = 'detail-section-title';
  title.textContent = 'Các vòng nộp và mốc thời gian';
  section.append(title);

  if (!Array.isArray(edition.rounds) || edition.rounds.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'detail-empty-note';
    empty.textContent = 'Chưa có thông tin vòng nộp bài chi tiết từ nguồn.';
    section.append(empty);
    return section;
  }

  for (const round of edition.rounds) {
    const card = document.createElement('div');
    card.className = 'round-card';

    const header = document.createElement('div');
    header.className = 'round-card__header';

    const roundTitle = document.createElement('h3');
    roundTitle.className = 'round-card__title';
    roundTitle.textContent = round.label || 'Vòng nộp';
    header.append(roundTitle);

    card.append(header);

    const list = document.createElement('ul');
    list.className = 'round-card__list';

    const deadlines = Array.isArray(round.deadlines) ? round.deadlines : [];

    if (deadlines.length === 0) {
      const li = document.createElement('li');
      li.className = 'deadline-row';
      const p = document.createElement('p');
      p.className = 'detail-empty-note';
      p.textContent = 'Chưa có mốc thời gian cụ thể.';
      li.append(p);
      list.append(li);
    } else {
      for (const d of deadlines) {
        const li = document.createElement('li');
        li.className = 'deadline-row';

        // 1. Loại deadline
        const typeCol = document.createElement('div');
        typeCol.className = 'deadline-row__type';
        const iconName = DEADLINE_TYPE_ICONS[d.type] || 'calendar';
        const typeLabel = DEADLINE_TYPE_LABELS[d.type] || d.type || 'Mốc thời gian';
        typeCol.append(createIcon(iconName), typeLabel);
        li.append(typeCol);

        // 2. Thời gian (GMT+7 & Giờ nguồn)
        const timeCol = document.createElement('div');
        timeCol.className = 'deadline-row__time';

        const instantText = document.createElement('span');
        instantText.className = 'deadline-row__instant';
        if (d.instant) {
          instantText.textContent = `${formatTimeGMT7(d.instant)} · ${formatDateGMT7(d.instant)}`;
        } else {
          instantText.textContent = d.sourceText || 'TBA';
        }
        timeCol.append(instantText);

        const sourceSub = document.createElement('span');
        sourceSub.className = 'deadline-row__source';
        const tzText = d.timezone ? ` [${d.timezone}]` : '';
        sourceSub.textContent = `Nguồn: ${d.sourceText || 'TBA'}${tzText}`;
        timeCol.append(sourceSub);

        li.append(timeCol);

        // 3. Trạng thái & Chất lượng
        const statusCol = document.createElement('div');
        statusCol.className = 'deadline-row__status';

        if (d.instant) {
          const targetTime = Date.parse(d.instant);
          const urgency = getUrgencyInfo(targetTime, now);
          const urgSpan = document.createElement('span');
          urgSpan.className = `urgency ${urgency.className}`;
          urgSpan.append(createIcon(urgency.icon), urgency.label);
          statusCol.append(urgSpan);
        }

        if (d.quality) {
          statusCol.append(createQualityBadge(d.quality));
        }

        li.append(statusCol);
        list.append(li);
      }
    }

    card.append(list);
    section.append(card);
  }

  return section;
}

/**
 * Tạo khối liên kết tài liệu hội nghị (CFP, Hướng dẫn tác giả, Template)
 * @param {object} edition
 * @returns {HTMLElement}
 */
function renderLinksSection(edition) {
  const card = document.createElement('section');
  card.className = 'detail-links-card';
  card.setAttribute('aria-labelledby', 'links-title');

  const title = document.createElement('h2');
  title.id = 'links-title';
  title.className = 'detail-section-title';
  title.textContent = 'Tài liệu và Hướng dẫn nộp bài';
  card.append(title);

  const grid = document.createElement('div');
  grid.className = 'detail-links-grid';

  let hasLinks = false;

  const linkConfigs = [
    { key: 'cfp', label: 'Call for Papers (CFP)', url: edition.links?.cfp },
    { key: 'authorGuide', label: 'Hướng dẫn tác giả (Author Guide)', url: edition.links?.authorGuide },
    { key: 'template', label: 'Biểu mẫu bài báo (Templates)', url: edition.links?.template },
  ];

  for (const item of linkConfigs) {
    if (item.url && (item.url.startsWith('http://') || item.url.startsWith('https://'))) {
      hasLinks = true;
      const a = document.createElement('a');
      a.className = 'button button--outline';
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.append(item.label, ' ', createIcon('ext'));
      grid.append(a);
    }
  }

  if (!hasLinks) {
    const note = document.createElement('p');
    note.className = 'detail-empty-note';
    note.textContent =
      'Các tài liệu nộp bài chi tiết (CFP, Template) được cập nhật trực tiếp tại trang chủ chính thức của kỳ hội nghị.';
    card.append(note);

    if (edition.websiteUrl) {
      const a = document.createElement('a');
      a.className = 'button button--outline';
      a.href = edition.websiteUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.append('Truy cập trang chính thức để xem CFP ', createIcon('ext'));
      grid.append(a);
      card.append(grid);
    }
  } else {
    card.append(grid);
  }

  return card;
}

/**
 * Tạo thông báo nguồn dữ liệu theo đặc tả F38
 * @param {object} meta - Catalog metadata
 * @returns {HTMLElement}
 */
function renderDataNotice(meta) {
  const notice = document.createElement('aside');
  const isStale = meta.mode === 'snapshot';
  notice.className = `data-notice ${isStale ? 'data-notice--stale' : ''}`;
  notice.setAttribute('role', 'status');

  const iconName = isStale ? 'alert' : 'check';
  notice.append(createIcon(iconName));

  const body = document.createElement('div');
  body.className = 'data-notice__body';

  const titleP = document.createElement('p');
  if (isStale) {
    titleP.textContent = 'Dữ liệu được nạp từ bản chụp snapshot dự phòng.';
  } else {
    titleP.textContent = 'Dữ liệu trực tiếp từ nguồn CCFDDL.';
  }
  body.append(titleP);

  const metaP = document.createElement('p');
  metaP.className = 'data-notice__meta';

  const loadedDateText = meta.loadedAt ? new Date(meta.loadedAt).toLocaleString('vi-VN') : 'vừa xong';
  metaP.textContent = `Tải lúc ${loadedDateText} · Kiểm chứng gần nhất: Chưa có lần kiểm chứng.`;
  body.append(metaP);

  notice.append(body);
  return notice;
}

/**
 * Khởi tạo dữ liệu và dựng trang chi tiết hội nghị
 */
async function initPage() {
  showState(host, {
    kind: 'loading',
    title: 'Đang tải dữ liệu hội nghị',
    message: 'Vui lòng chờ trong giây lát...',
  });

  try {
    const catalog = await getCatalog();
    const editionId = new URLSearchParams(location.search).get('id');

    if (!editionId) {
      showState(host, {
        kind: 'empty',
        title: 'Chưa chọn kỳ hội nghị',
        message: 'Vui lòng quay lại trang Khám phá để chọn một hội nghị cần xem chi tiết.',
        action: { label: 'Đến trang Khám phá', href: 'lich-hoi-nghi.html' },
      });
      return;
    }

    const edition = catalog.editions.find(item => item.id === editionId);

    if (!edition) {
      showState(host, {
        kind: 'empty',
        title: 'Không tìm thấy kỳ hội nghị',
        message: `Hệ thống không tìm thấy hội nghị nào với mã "${editionId}".`,
        action: { label: 'Quay lại danh sách hội nghị', href: 'lich-hoi-nghi.html' },
      });
      return;
    }

    // Cập nhật tiêu đề trang
    document.title = `${edition.acronym} ${edition.year || ''} · UIT ConFinder`;

    const now = Date.now();
    const nextInfo = getNextSubmission(edition, { now });

    // Xóa trạng thái loading và dựng các khối giao diện
    host.replaceChildren(
      renderHero(edition),
      renderNextSubmissionBox(edition, nextInfo, now),
      renderRoundsSection(edition, now),
      renderLinksSection(edition),
      renderDataNotice(catalog.meta)
    );
  } catch (error) {
    showState(host, {
      kind: 'error',
      title: 'Không tải được dữ liệu',
      message: error.message || 'Đã có lỗi xảy ra trong quá trình nạp thông tin.',
      action: { label: 'Thử lại', onClick: initPage },
    });
  }
}

initPage();
