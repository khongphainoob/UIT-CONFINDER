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

  // Nếu không có mốc nào đúng loại kind (ví dụ kind='abstract' nhưng chỉ có mốc paper)
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
      // Deadline đúng bằng now thì coi như đã hết hạn, không được đưa vào futureDeadlines (theo test case T26)
      if (time > now) {
        futureDeadlines.push({ ...item, targetTime: time });
      } else {
        pastDeadlines.push({ ...item, targetTime: time });
      }
    } else {
      undeterminedDeadlines.push(item);
    }
  }

  // Sắp xếp tương lai: sớm nhất đến muộn nhất; tie-breaker: abstract ưu tiên trước paper
  futureDeadlines.sort((a, b) => {
    if (a.targetTime !== b.targetTime) return a.targetTime - b.targetTime;
    if (a.type !== b.type) return a.type === 'abstract' ? -1 : 1;
    return 0;
  });

  // Sắp xếp quá khứ: gần nhất đến xa nhất (giảm dần)
  pastDeadlines.sort((a, b) => {
    if (b.targetTime !== a.targetTime) return b.targetTime - a.targetTime;
    if (a.type !== b.type) return a.type === 'paper' ? -1 : 1;
    return 0;
  });

  // 1. Còn mốc tương lai hợp lệ
  if (futureDeadlines.length > 0) {
    return {
      status: 'upcoming',
      deadline: futureDeadlines[0],
      futureDeadlines,
    };
  }

  // 2. Tất cả mốc đều đã qua (và không còn mốc TBA/date-only/ước lượng nào)
  if (undeterminedDeadlines.length === 0 && pastDeadlines.length > 0) {
    return {
      status: 'closed',
      deadline: pastDeadlines[0],
      futureDeadlines: [],
    };
  }

  // 3. Có mốc chưa xác định rõ (TBA/ước lượng/date-only)
  return {
    status: 'unknown',
    deadline: undeterminedDeadlines[0] || (pastDeadlines.length > 0 ? pastDeadlines[0] : null),
    futureDeadlines: [],
  };
}

export function getUrgencyInfo(targetTime, now = Date.now()) {
  let timeMs = targetTime;
  if (typeof timeMs === 'string') {
    timeMs = Date.parse(timeMs);
  }

  if (timeMs === null || timeMs === undefined || Number.isNaN(timeMs)) {
    return { level: 'unknown', label: 'Chưa rõ', className: 'urgency--unknown', icon: 'help' };
  }

  const diffMs = timeMs - now;
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
  let timeMs = targetTime;
  if (typeof timeMs === 'string') {
    timeMs = Date.parse(timeMs);
  }

  if (timeMs === null || timeMs === undefined || Number.isNaN(timeMs)) {
    return 'Chưa rõ';
  }

  const diffMs = timeMs - now;
  if (diffMs <= 0) {
    return 'Đã hết hạn';
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `còn ${days} ngày ${hours} giờ` : `còn ${days} ngày`;
  }
  if (hours > 0) {
    return minutes > 0 ? `còn ${hours} giờ ${minutes} phút` : `còn ${hours} giờ`;
  }
  if (minutes > 0) {
    return `còn ${minutes} phút`;
  }
  return 'còn dưới 1 phút';
}

export function formatTimeGMT7(input) {
  if (!input && input !== 0) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' GMT+7';
}

export function formatDateGMT7(input) {
  if (!input && input !== 0) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Đánh giá tính cũ (stale) nội bộ 30 ngày từ lần kiểm nguồn thật (checkedAt).
 * Quy tắc:
 * - Tuyệt đối không tính từ fetchedAt hay loadedAt.
 * - Thiếu ngày kiểm (checkedAt null hoặc không hợp lệ): có trạng thái và nhãn riêng biệt ('unverified-source').
 * - Đã quá 30 ngày kể từ checkedAt: isStale = true ('stale').
 * - Trong vòng 30 ngày: isStale = false ('fresh').
 */
export function getStaleInfo(checkedAt, now = Date.now()) {
  if (!checkedAt) {
    return {
      status: 'unverified-source',
      isStale: false,
      hasCheckedDate: false,
      label: 'Chưa kiểm chứng nguồn thật',
      days: null,
    };
  }

  const checkMs = typeof checkedAt === 'number' ? checkedAt : Date.parse(checkedAt);
  if (Number.isNaN(checkMs)) {
    return {
      status: 'unverified-source',
      isStale: false,
      hasCheckedDate: false,
      label: 'Chưa kiểm chứng nguồn thật',
      days: null,
    };
  }

  const diffMs = now - checkMs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 30) {
    return {
      status: 'stale',
      isStale: true,
      hasCheckedDate: true,
      label: `Dữ liệu đã cũ (quá ${diffDays} ngày chưa kiểm tra lại nguồn)`,
      days: diffDays,
    };
  }

  return {
    status: 'fresh',
    isStale: false,
    hasCheckedDate: true,
    label: diffDays <= 0 ? 'Đã kiểm nguồn hôm nay' : `Đã kiểm nguồn ${diffDays} ngày trước`,
    days: diffDays,
  };
}

/**
 * Chuẩn hóa chất lượng dữ liệu của mốc deadline (quality):
 * - 'verified': CHỈ KHI đối chiếu nguồn chính thức có verifiedAt.
 * - 'estimated': thời gian ước lượng.
 * - 'tba': chưa công bố thời gian.
 * - 'unverified': chưa đối chiếu nguồn chính thức (mặc định).
 */
export function resolveDeadlineQuality(deadline, edition = null) {
  if (!deadline || typeof deadline !== 'object') return 'unverified';

  const rawQuality = deadline.quality;
  const rawText = (deadline.sourceText || '').trim().toUpperCase();

  if (
    deadline.precision === 'unknown' ||
    rawQuality === 'tba' ||
    rawText === 'TBA' ||
    rawText === 'TBD' ||
    !deadline.sourceText
  ) {
    return 'tba';
  }

  if (rawQuality === 'estimated') {
    return 'estimated';
  }

  const verifiedDate = deadline.verifiedAt || edition?.verifiedAt;
  const hasValidVerifiedAt =
    verifiedDate &&
    typeof verifiedDate === 'string' &&
    !Number.isNaN(Date.parse(verifiedDate));

  if (rawQuality === 'verified' && hasValidVerifiedAt) {
    return 'verified';
  }

  return 'unverified';
}
