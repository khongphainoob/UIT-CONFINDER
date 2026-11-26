// Kiểm thử xuất lịch Google Calendar và tệp .ics (TV4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleCalendarUrl, createIcs } from '../site/js/calendar-export.js';

const EDITION = {
  id: 'demo-2027',
  acronym: 'DEMO',
  year: 2027,
  place: 'Hà Nội; Việt Nam',
  websiteUrl: 'https://example.com',
};

const DEADLINE = {
  id: 'r2-paper',
  type: 'paper',
  roundId: 'r2',
  roundLabel: 'Fast track',
  instant: '2027-01-15T23:59:59-12:00',
  sourceText: '2027-01-15 23:59:59',
  timezone: 'AoE',
  precision: 'instant',
  quality: 'unverified',
};

test('ICS đổi giờ AoE sang UTC và giữ đúng mốc đã chọn', () => {
  const ics = createIcs(EDITION, DEADLINE);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /\r\nDTSTART:20270116T115959Z\r\n/);
  assert.match(ics, /\r\nUID:demo-2027-r2-paper@uit-confinder\.local\r\n/);
  assert.match(ics, /\r\nSUMMARY:DEMO 2027 - Paper deadline\r\n/);
  assert.match(ics, /Round: Fast track/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});

test('ICS dùng CRLF cho mọi dòng và escape ký tự đặc biệt', () => {
  const ics = createIcs(EDITION, DEADLINE);
  assert.equal(/[^\r]\n/.test(ics), false, 'mọi \\n phải đi sau \\r');
  assert.match(ics, /\r\nLOCATION:Hà Nội\\; Việt Nam\r\n/);
});

test('ICS không tự thêm thời lượng hay nhắc hẹn', () => {
  const ics = createIcs(EDITION, DEADLINE);
  for (const field of ['DTEND', 'DURATION', 'VALARM']) {
    assert.equal(ics.includes(field), false, field);
  }
});

test('link Google Calendar mang đúng tham số', () => {
  const url = new URL(buildGoogleCalendarUrl(EDITION, DEADLINE));
  assert.equal(url.origin + url.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), 'DEMO 2027 - Paper deadline');
  assert.equal(url.searchParams.get('dates'), '20270116T115959Z/20270116T115959Z');
  assert.equal(url.searchParams.get('location'), 'Hà Nội; Việt Nam');
});

test('từ chối xuất lịch khi mốc không đủ chính xác, kèm lý do', () => {
  const cases = [
    [{ ...DEADLINE, precision: 'unknown', instant: null, quality: 'tba' }, /TBA/],
    [{ ...DEADLINE, precision: 'date', instant: null }, /chưa có giờ chính xác/],
    [{ ...DEADLINE, quality: 'estimated' }, /Estimated/],
    [{ ...DEADLINE, instant: '2027-01-15T23:59:59' }, /ISO 8601/],
  ];
  for (const [deadline, reason] of cases) {
    assert.throws(() => createIcs(EDITION, deadline), reason);
    assert.throws(() => buildGoogleCalendarUrl(EDITION, deadline), reason);
  }
});

test('thiếu kỳ hội nghị hoặc chưa chọn mốc thì báo lỗi', () => {
  assert.throws(() => createIcs(null, DEADLINE), /thiếu mã kỳ hội nghị/);
  assert.throws(() => createIcs(EDITION, null), /chưa chọn mốc/);
});
