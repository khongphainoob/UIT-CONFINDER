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
import { buildGoogleCalendarUrl, createIcs } from '../calendar-export.js';
import { getSavedIds, toggleSaved } from '../saved-store.js';

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

function showToast(message) {
  let toast = document.querySelector('.detail-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'detail-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add('detail-toast--visible');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('detail-toast--visible');
  }, 3200);
}

function getAllDeadlines(edition) {
  const list = [];
  if (!edition || !Array.isArray(edition.rounds)) return list;
  for (const round of edition.rounds) {
    if (!round || !Array.isArray(round.deadlines)) continue;
    for (const d of round.deadlines) {
      if (!d) continue;
      list.push({
        ...d,
        roundId: round.id,
        roundLabel: round.label,
      });
    }
  }
  return list;
}

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

  // Hàng hành động CTA: Website chính thức, Nguồn dữ liệu đối chiếu, Nút Lưu
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

  // 2. Link nguồn dữ liệu đối chiếu (CCFDDL / portal)
  if (edition.sourceUrl && (edition.sourceUrl.startsWith('http://') || edition.sourceUrl.startsWith('https://'))) {
    const sourceLink = document.createElement('a');
    sourceLink.className = 'button button--outline';
    sourceLink.href = edition.sourceUrl;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.append('Nguồn đối chiếu ', createIcon('ext'));
    actionsRow.append(sourceLink);
  }

  // 3. Nút Lưu hội nghị (kết nối SavedStore theo API TV4)
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'button button--outline';
  saveBtn.setAttribute('aria-pressed', 'false');
  let saveWarning = null;
  const showSaveWarning = (message) => {
    if (!saveWarning) {
      saveWarning = document.createElement('p');
      saveWarning.className = 'save-warning';
      saveWarning.setAttribute('role', 'alert');
      actionsRow.append(saveWarning);
    }
    saveWarning.textContent = message;
  };

  try {
    const { ok, ids } = getSavedIds();
    if (ok && Array.isArray(ids) && ids.includes(edition.id)) {
      saveBtn.setAttribute('aria-pressed', 'true');
      saveBtn.replaceChildren(createIcon('star'), ' Đã lưu');
    } else {
      saveBtn.replaceChildren(createIcon('star'), ' Lưu hội nghị');
    }
  } catch (error) {
    saveBtn.replaceChildren(createIcon('star'), ' Lưu hội nghị');
    console.error('Không đọc được trạng thái lưu hội nghị:', error);
  }

  saveBtn.addEventListener('click', () => {
    const res = toggleSaved(edition.id);
    if (!res?.ok) {
      console.error('Không cập nhật được trạng thái lưu hội nghị:', res?.error);
      showToast(res?.error || 'Không cập nhật được trạng thái lưu.');
      return;
    }
    const isSaved = res.saved;
    saveBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
    saveBtn.replaceChildren(createIcon('star'), isSaved ? ' Đã lưu' : ' Lưu hội nghị');
    showToast(isSaved ? 'Đã lưu hội nghị thành công.' : 'Đã bỏ lưu hội nghị.');
  });

  // Lắng nghe sự kiện saved:changed từ TV4 contract để đồng bộ giữa các tab hoặc nút
  window.addEventListener('saved:changed', (e) => {
    const ids = e.detail?.ids;
    if (Array.isArray(ids)) {
      const isSaved = ids.includes(edition.id);
      saveBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
      saveBtn.replaceChildren(createIcon('star'), isSaved ? ' Đã lưu' : ' Lưu hội nghị');
    }
  });

  actionsRow.append(saveBtn);
  hero.append(actionsRow);

  return hero;
}

function renderHighlightBox(edition, selectedDeadline, nextInfo, isUserSelected, now) {
  const isClosed = nextInfo.status === 'closed';

  const box = document.createElement('section');
  box.id = 'highlight-box';
  box.className = `detail-highlight ${isClosed ? 'detail-highlight--closed' : ''}`;
  box.setAttribute('aria-labelledby', 'highlight-title');

  const head = document.createElement('div');
  head.className = 'detail-highlight__head';

  const label = document.createElement('h2');
  label.id = 'highlight-title';
  label.className = 'detail-highlight__label';

  if (isClosed) {
    if (isUserSelected && selectedDeadline) {
      const typeName = DEADLINE_TYPE_LABELS[selectedDeadline.type] || selectedDeadline.type || 'Hạn nộp';
      const roundPrefix = selectedDeadline.roundLabel ? `[${selectedDeadline.roundLabel}] ` : '';
      label.textContent = `Mốc đã kết thúc · ${roundPrefix}${typeName}`;
    } else {
      label.textContent = 'Tất cả các mốc nộp bài đã kết thúc';
    }
  } else if (selectedDeadline) {
    const typeName = DEADLINE_TYPE_LABELS[selectedDeadline.type] || selectedDeadline.type || 'Hạn nộp';
    if (!isUserSelected) {
      label.textContent = `Mốc tiếp theo · ${typeName}`;
    } else {
      const roundPrefix = selectedDeadline.roundLabel ? `[${selectedDeadline.roundLabel}] ` : '';
      label.textContent = `Mốc đang theo dõi · ${roundPrefix}${typeName}`;
    }
  } else {
    label.textContent = 'Mốc nộp bài cần đối chiếu';
  }
  head.append(label);

  // Nhãn chất lượng dữ liệu
  if (selectedDeadline?.quality) {
    head.append(createQualityBadge(selectedDeadline.quality));
  }
  box.append(head);

  const body = document.createElement('div');
  body.className = 'detail-highlight__body';

  // Countdown & Urgency
  const countdownWrap = document.createElement('div');
  countdownWrap.className = 'detail-highlight__countdown-wrap';

  if (selectedDeadline?.instant) {
    const targetTime = Date.parse(selectedDeadline.instant);
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
    urgencyBadge.append(createIcon('pause'), selectedDeadline?.sourceText || 'Chưa công bố ngày giờ');
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

  if (selectedDeadline?.instant) {
    gmtVal.textContent = `${formatTimeGMT7(selectedDeadline.instant)} · ${formatDateGMT7(selectedDeadline.instant)}`;
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

  const tzSuffix = selectedDeadline?.timezone ? ` (${selectedDeadline.timezone})` : '';
  srcVal.textContent = `${selectedDeadline?.sourceText || 'TBA'}${tzSuffix}`;
  srcCol.append(srcLabel, srcVal);
  timesGrid.append(srcCol);

  body.append(timesGrid);

  // Hàng nút tích hợp xuất lịch Calendar theo API TV4 (Google Calendar & ICS)
  const calActions = document.createElement('div');
  calActions.className = 'detail-highlight__calendar-actions';

  const targetTime = selectedDeadline?.instant ? Date.parse(selectedDeadline.instant) : null;
  const isExpired = targetTime !== null && !Number.isNaN(targetTime) && targetTime <= now;

  const canExport = Boolean(
    !isExpired &&
    selectedDeadline?.instant &&
    selectedDeadline.precision === 'instant' &&
    selectedDeadline.quality !== 'estimated' &&
    selectedDeadline.quality !== 'tba'
  );

  // Nút 1: Thêm vào Google Calendar
  const gcalBtn = document.createElement('button');
  gcalBtn.type = 'button';
  gcalBtn.className = 'button button--outline button--sm';
  gcalBtn.append(createIcon('calendar'), ' Thêm vào Google Calendar');

  if (!canExport) {
    gcalBtn.disabled = true;
    gcalBtn.setAttribute('aria-disabled', 'true');
    gcalBtn.title = isExpired
      ? 'Mốc nộp bài này đã kết thúc, không thể xuất lịch nhắc hẹn.'
      : 'Mốc này chưa có ngày giờ chính xác hoặc là TBA/ước tính, không hỗ trợ xuất lịch.';
  } else {
    gcalBtn.addEventListener('click', () => {
      try {
        const url = buildGoogleCalendarUrl(edition, selectedDeadline);
        if (url && typeof url === 'string') {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch (err) {
        console.warn('Lỗi khi tạo liên kết Google Calendar:', err);
        showToast(err.message || 'Không thể tạo liên kết Google Calendar.');
      }
    });
  }
  calActions.append(gcalBtn);

  // Nút 2: Tải file .ics
  const icsBtn = document.createElement('button');
  icsBtn.type = 'button';
  icsBtn.className = 'button button--outline button--sm';
  icsBtn.append(createIcon('calendar'), ' Tải file .ics');

  if (!canExport) {
    icsBtn.disabled = true;
    icsBtn.setAttribute('aria-disabled', 'true');
    icsBtn.title = isExpired
      ? 'Mốc nộp bài này đã kết thúc, không thể xuất lịch nhắc hẹn.'
      : 'Mốc này chưa có ngày giờ chính xác hoặc là TBA/ước tính, không hỗ trợ xuất lịch.';
  } else {
    icsBtn.addEventListener('click', () => {
      try {
        const icsContent = createIcs(edition, selectedDeadline);
        if (icsContent && typeof icsContent === 'string') {
          const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `${edition.acronym || 'conference'}-${selectedDeadline.id || 'deadline'}.ics`;
          document.body.append(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(downloadUrl);
          showToast('Đã tạo và tải file lịch .ics thành công.');
        }
      } catch (err) {
        console.warn('Lỗi khi tạo file ICS:', err);
        showToast(err.message || 'Không thể tạo file .ics.');
      }
    });
  }
  calActions.append(icsBtn);

  if (!canExport && selectedDeadline) {
    const note = document.createElement('span');
    note.className = 'detail-calendar-note';
    if (isExpired) {
      note.textContent = 'Lưu ý: Mốc nộp bài này đã kết thúc, không hỗ trợ xuất lịch nhắc hẹn.';
    } else {
      note.textContent = 'Lưu ý: Mốc này chưa có giờ chính xác (TBA, chỉ có ngày hoặc Estimated), không hỗ trợ xuất lịch.';
    }
    calActions.append(note);
  }

  body.append(calActions);
  box.append(body);

  return box;
}

function renderRoundsSection(edition, selectedDeadlineId, onSelectDeadline, now) {
  const section = document.createElement('section');
  section.id = 'rounds-section';
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
        const itemData = {
          ...d,
          roundId: round.id,
          roundLabel: round.label,
        };

        const isSelected = itemData.id === selectedDeadlineId;
        const li = document.createElement('li');
        li.className = `deadline-row deadline-row--interactive ${isSelected ? 'deadline-row--selected' : ''}`;
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
        li.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

        // Bấm vào hàng hoặc gõ phím Enter/Space để chọn mốc deadline này
        const handleSelect = () => {
          onSelectDeadline(itemData);
        };
        li.addEventListener('click', handleSelect);
        li.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelect();
          }
        });

        // 1. Loại deadline
        const typeCol = document.createElement('div');
        typeCol.className = 'deadline-row__type';
        const iconName = DEADLINE_TYPE_ICONS[d.type] || 'calendar';
        const typeLabel = DEADLINE_TYPE_LABELS[d.type] || d.type || 'Mốc thời gian';
        typeCol.append(createIcon(iconName), typeLabel);
        li.append(typeCol);

        // 2. Thời gian (GMT+7 & Giờ nguồn) kèm link nguồn và ngày kiểm chứng
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
        sourceSub.append(`Nguồn: ${d.sourceText || 'TBA'}${tzText}`);

        // Link nguồn đối chiếu riêng của mốc (nếu có)
        if (d.sourceUrl && (d.sourceUrl.startsWith('http://') || d.sourceUrl.startsWith('https://'))) {
          const srcLink = document.createElement('a');
          srcLink.className = 'deadline-source-link';
          srcLink.href = d.sourceUrl;
          srcLink.target = '_blank';
          srcLink.rel = 'noopener noreferrer';
          srcLink.append(' [Nguồn]');
          srcLink.addEventListener('click', (e) => e.stopPropagation());
          sourceSub.append(srcLink);
        }

        // Ngày kiểm chứng của mốc (nếu có)
        if (d.checkedAt) {
          sourceSub.append(` · Đã đối chiếu: ${formatDateGMT7(d.checkedAt)}`);
        }

        timeCol.append(sourceSub);
        li.append(timeCol);

        // 3. Trạng thái, Chất lượng & Nút chọn mốc
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

        // Nút chọn / Huy hiệu Đang chọn
        const actionsCol = document.createElement('div');
        actionsCol.className = 'deadline-row__actions';

        if (isSelected) {
          const pill = document.createElement('span');
          pill.className = 'deadline-selected-pill';
          pill.append(createIcon('check'), ' Đang chọn');
          actionsCol.append(pill);
        } else {
          const selectBtn = document.createElement('button');
          selectBtn.type = 'button';
          selectBtn.className = 'button button--ghost button--sm';
          selectBtn.textContent = 'Chọn theo dõi';
          selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleSelect();
          });
          actionsCol.append(selectBtn);
        }
        statusCol.append(actionsCol);

        li.append(statusCol);
        list.append(li);
      }
    }

    card.append(list);
    section.append(card);
  }

  return section;
}

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

function renderDataNotice(meta, edition) {
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
  const checkedAtTime = edition?.checkedAt || meta?.checkedAt;
  const checkedDateText = checkedAtTime ? formatDateGMT7(checkedAtTime) : 'Chưa có lần kiểm chứng';

  metaP.append(`Tải lúc ${loadedDateText} · Kiểm chứng gần nhất: ${checkedDateText}. `);

  // Hiển thị liên kết nguồn dữ liệu gốc
  const sourceUrl = edition?.sourceUrl || meta?.sourceUrl;
  if (sourceUrl && (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://'))) {
    const srcA = document.createElement('a');
    srcA.className = 'data-notice__source-link';
    srcA.href = sourceUrl;
    srcA.target = '_blank';
    srcA.rel = 'noopener noreferrer';
    srcA.append('Xem nguồn dữ liệu gốc CCFDDL ', createIcon('ext'));
    metaP.append(srcA);
  }

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
    const searchParams = new URLSearchParams(location.search);
    const editionId = searchParams.get('id');
    const urlDeadlineId = searchParams.get('deadlineId');

    // 1. Kiểm tra thiếu editionId (missing ID)
    if (!editionId) {
      showState(host, {
        kind: 'empty',
        title: 'Chưa chọn kỳ hội nghị',
        message: 'Vui lòng quay lại trang Khám phá để chọn một hội nghị cần xem chi tiết.',
        action: { label: 'Đến trang Khám phá', href: 'conferences.html' },
      });
      return;
    }

    const edition = catalog.editions.find((item) => item.id === editionId);

    // 2. Kiểm tra không tìm thấy kỳ hội nghị (invalid ID)
    if (!edition) {
      showState(host, {
        kind: 'empty',
        title: 'Không tìm thấy kỳ hội nghị',
        message: `Hệ thống không tìm thấy hội nghị nào với mã "${editionId}".`,
        action: { label: 'Quay lại danh sách hội nghị', href: 'conferences.html' },
      });
      return;
    }

    // Cập nhật tiêu đề trang
    document.title = `${edition.acronym} ${edition.year || ''} · UIT ConFinder`;

    const now = Date.now();
    const nextInfo = getNextSubmission(edition, { now });
    const allDeadlines = getAllDeadlines(edition);

    // Xác định mốc deadline được chọn ban đầu:
    // Ưu tiên mốc từ URL query param deadlineId -> nếu không có thì lấy mốc tiếp theo -> nếu không thì lấy mốc đầu tiên
    let selectedDeadline = null;
    let isUserSelected = false;

    if (urlDeadlineId) {
      selectedDeadline = allDeadlines.find((d) => d.id === urlDeadlineId) || null;
      if (selectedDeadline) isUserSelected = true;
    }
    if (!selectedDeadline) {
      selectedDeadline = nextInfo.deadline || allDeadlines[0] || null;
      isUserSelected = false;
    }

    // Khi hội nghị đã kết thúc (closed) và người dùng chưa chủ động click chọn mốc nào,
    // ta không highlight mặc định mốc cuối cùng để tránh gây hiểu lầm là danh sách xếp ngược.
    const initialActiveId = (nextInfo.status === 'closed' && !isUserSelected)
      ? null
      : (selectedDeadline?.id || null);

    // Callback khi người dùng click chọn 1 mốc deadline
    const handleSelectDeadline = (newDeadline) => {
      selectedDeadline = newDeadline;
      isUserSelected = true;

      // Cập nhật tham số deadlineId trên URL mà không reload trang
      const currentUrl = new URL(location.href);
      if (newDeadline?.id) {
        currentUrl.searchParams.set('deadlineId', newDeadline.id);
      } else {
        currentUrl.searchParams.delete('deadlineId');
      }
      history.replaceState(null, '', currentUrl.toString());

      // Cập nhật lại Highlight Box và Rounds Section với mốc mới
      const oldHighlight = host.querySelector('#highlight-box');
      const newHighlight = renderHighlightBox(edition, selectedDeadline, nextInfo, true, now);
      if (oldHighlight) {
        oldHighlight.replaceWith(newHighlight);
      }

      const oldRounds = host.querySelector('#rounds-section');
      const newRounds = renderRoundsSection(edition, selectedDeadline?.id || null, handleSelectDeadline, now);
      if (oldRounds) {
        oldRounds.replaceWith(newRounds);
      }

      showToast(`Đã chọn mốc: ${DEADLINE_TYPE_LABELS[newDeadline?.type] || newDeadline?.type || 'Hạn nộp'}`);
    };

    // Dựng toàn bộ trang
    host.replaceChildren(
      renderHero(edition),
      renderHighlightBox(edition, selectedDeadline, nextInfo, isUserSelected, now),
      renderRoundsSection(edition, initialActiveId, handleSelectDeadline, now),
      renderLinksSection(edition),
      renderDataNotice(catalog.meta, edition)
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
