// TV1: hàm thuần, không document/localStorage/fetch. Dùng chung mọi trang.
// kind: 'any' | 'abstract' | 'paper'; now là số milliseconds.
// Trả { status: 'upcoming'|'unknown'|'closed', deadline, futureDeadlines }.
// deadline là object có ID (hoặc null), không phải chuỗi countdown.
export function getNextSubmission(edition, { kind = 'any', now = Date.now() } = {}) {
  if (!edition || !Array.isArray(edition.rounds)) {
    return { status: 'unknown', deadline: null, futureDeadlines: [] };
  }

  const allSubmissions = [];

  for (const round of edition.rounds) {
    if (!round || !Array.isArray(round.deadlines)) continue;

    for (const d of round.deadlines) {
      if (!d) continue;

      if (d.type !== 'abstract' && d.type !== 'paper') continue;

      if (kind === 'abstract' && d.type !== 'abstract') continue;
      if (kind === 'paper' && d.type !== 'paper') continue;

      allSubmissions.push({
        ...d,
        roundId: round.id,
        roundLabel: round.label,
      });
    }
  }

  if (allSubmissions.length === 0) {
    return { status: 'unknown', deadline: null, futureDeadlines: [] };
  }

  const futureDeadlines = [];
  const pastDeadlines = [];
  const undeterminedDeadlines = [];

  for (const item of allSubmissions) {
    const isPreciseInstant =
      item.precision === 'instant' &&
      item.instant &&
      !Number.isNaN(Date.parse(item.instant)) &&
      item.quality !== 'estimated' &&
      item.quality !== 'tba';

    if (isPreciseInstant) {
      const time = Date.parse(item.instant);
      if (time > now) {
        futureDeadlines.push({ ...item, targetTime: time });
      } else {
        pastDeadlines.push({ ...item, targetTime: time });
      }
    } else {
      undeterminedDeadlines.push(item);
    }
  }

  futureDeadlines.sort((a, b) => a.targetTime - b.targetTime);

  pastDeadlines.sort((a, b) => b.targetTime - a.targetTime);

  if (futureDeadlines.length > 0) {
    return {
      status: 'upcoming',
      deadline: futureDeadlines[0],
      futureDeadlines,
    };
  }

  if (undeterminedDeadlines.length === 0 && pastDeadlines.length > 0) {
    return {
      status: 'closed',
      deadline: pastDeadlines[0],
      futureDeadlines: [],
    };
  }

  return {
    status: 'unknown',
    deadline: undeterminedDeadlines[0] || (pastDeadlines.length > 0 ? pastDeadlines[0] : null),
    futureDeadlines: [],
  };
}

export function getUrgencyInfo(targetTime, now = Date.now()) {
  if (targetTime === null || Number.isNaN(targetTime)) {
    return { level: 'unknown', label: 'Chưa rõ', className: 'urgency--unknown', icon: 'help' };
  }

  const diffMs = targetTime - now;
  if (diffMs <= 0) {
    return { level: 'expired', label: 'Đã hết hạn', className: 'urgency--expired', icon: 'x-circle' };
  }

  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 3) {
    return { level: 'urgent', label: 'Gấp', className: 'urgency--urgent', icon: 'alert' };
  }
  if (diffDays < 7) {
    return { level: 'week', label: 'Trong tuần', className: 'urgency--week', icon: 'clock' };
  }
  if (diffDays < 30) {
    return { level: 'month', label: 'Trong tháng', className: 'urgency--month', icon: 'calendar' };
  }
  return { level: 'open', label: 'Còn rộng', className: 'urgency--open', icon: 'check-circle' };
}

export function getCountdownText(targetTime, now = Date.now()) {
  const diffMs = targetTime - now;
  if (diffMs <= 0) return 'Đã hết hạn';

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `còn ${days} ngày ${hours} giờ`;
  }
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `còn ${hours} giờ ${minutes} phút`;
}

export function formatTimeGMT7(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' GMT+7';
}

export function formatDateGMT7(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
