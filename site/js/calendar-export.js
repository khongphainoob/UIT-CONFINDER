// TBA/date-only/Estimated phải từ chối có lý do trước khi mở/tải.

const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/render';
const ICS_PRODID = '-//UIT ConFinder//Calendar Export//VI';

function assertExportable(edition, deadline) {
  if (!edition || typeof edition !== 'object' || !edition.id) {
    throw new Error('Không thể xuất lịch: thiếu mã kỳ hội nghị.');
  }
  if (!deadline || typeof deadline !== 'object' || !deadline.id) {
    throw new Error('Không thể xuất lịch: chưa chọn mốc thời gian.');
  }
  if (deadline.precision !== 'instant') {
    throw new Error('Mốc này chưa có giờ chính xác; TBA hoặc chỉ có ngày không thể xuất lịch.');
  }
  if (deadline.quality === 'estimated') {
    throw new Error('Mốc Estimated không thể xuất lịch vì thời gian chỉ là ước tính.');
  }
  if (deadline.quality === 'tba') {
    throw new Error('Mốc TBA không thể xuất lịch vì chưa công bố thời gian.');
  }
  if (
    typeof deadline.instant !== 'string' ||
    !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(deadline.instant) ||
    Number.isNaN(Date.parse(deadline.instant))
  ) {
    throw new Error('Mốc này không có instant ISO 8601 hợp lệ kèm múi giờ.');
  }
}

function formatUtc(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join('') + 'T' + [
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join('') + 'Z';
}

function escapeIcsText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function getTypeLabel(deadline) {
  const labels = {
    abstract: 'Abstract deadline',
    paper: 'Paper deadline',
    rebuttal: 'Rebuttal deadline',
    decision: 'Decision',
    opening: 'Conference opening',
  };
  return labels[deadline.type] || 'Conference milestone';
}

function getEventSummary(edition, deadline) {
  const editionName = [edition.acronym, edition.year].filter(Boolean).join(' ');
  return `${editionName || edition.name || edition.id} - ${getTypeLabel(deadline)}`;
}

function getEventDetails(edition, deadline) {
  const lines = [
    `Edition: ${edition.id}`,
    `Deadline: ${deadline.id}`,
    `Round: ${deadline.roundLabel || deadline.roundId || 'Unknown'}`,
    `Source time: ${deadline.sourceText || deadline.instant}`,
  ];
  if (deadline.timezone) lines.push(`Source timezone: ${deadline.timezone}`);
  if (edition.websiteUrl) lines.push(`Conference website: ${edition.websiteUrl}`);
  return lines.join('\n');
}

function getEventUid(edition, deadline) {
  return `${edition.id}-${deadline.id}@uit-confinder.local`;
}

function getEventData(edition, deadline) {
  assertExportable(edition, deadline);
  return {
    date: new Date(deadline.instant),
    summary: getEventSummary(edition, deadline),
    details: getEventDetails(edition, deadline),
    uid: getEventUid(edition, deadline),
  };
}

export function buildGoogleCalendarUrl(edition, deadline) {
  const event = getEventData(edition, deadline);
  const timestamp = formatUtc(event.date);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.summary,
    dates: `${timestamp}/${timestamp}`,
    details: event.details,
  });
  if (edition.place) params.set('location', edition.place);
  return `${GOOGLE_CALENDAR_URL}?${params.toString()}`;
}

export function createIcs(edition, deadline) {
  const event = getEventData(edition, deadline);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${ICS_PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(event.date)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(event.details)}`,
  ];
  if (edition.place) lines.push(`LOCATION:${escapeIcsText(edition.place)}`);
  if (edition.websiteUrl) lines.push(`URL:${edition.websiteUrl}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
