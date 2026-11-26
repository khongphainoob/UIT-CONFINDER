// Kiểm thử helper deadline dùng chung (TV1). Mọi ca dùng một mốc now cố định.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getNextSubmission,
  getUrgencyInfo,
  getCountdownText,
  formatTimeGMT7,
  formatDateGMT7,
  getStaleInfo,
} from '../site/js/deadline-utils.js';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const iso = (ms) => new Date(ms).toISOString();

function deadline(id, type, ms, extra = {}) {
  return { id, type, instant: iso(ms), precision: 'instant', quality: 'unverified', ...extra };
}

function edition(rounds) {
  return { id: 'demo-2027', rounds };
}

test('đếm ngược: đã qua, đúng bằng now và dữ liệu thiếu', () => {
  assert.equal(getCountdownText(NOW - DAY, NOW), 'Đã hết hạn');
  assert.equal(getCountdownText(NOW, NOW), 'Đã hết hạn');
  assert.equal(getCountdownText(null, NOW), 'Chưa rõ');
  assert.equal(getCountdownText(Number.NaN, NOW), 'Chưa rõ');
});

test('đếm ngược: ngày giờ, giờ phút, dưới 1 phút', () => {
  assert.equal(getCountdownText(NOW + 2 * DAY + 5 * HOUR, NOW), 'còn 2 ngày 5 giờ');
  assert.equal(getCountdownText(NOW + 4 * HOUR + 30 * MINUTE, NOW), 'còn 4 giờ 30 phút');
  assert.equal(getCountdownText(NOW + 30 * 1000, NOW), 'còn dưới 1 phút');
  assert.equal(getCountdownText(iso(NOW + 3 * DAY), NOW), 'còn 3 ngày');
});

test('đếm ngược qua ranh giới năm và tháng', () => {
  const yearNow = Date.parse('2026-12-31T23:59:59Z');
  assert.equal(getCountdownText('2027-01-01T00:00:00Z', yearNow), 'còn dưới 1 phút');
  assert.equal(getUrgencyInfo('2027-01-01T00:00:00Z', yearNow).level, 'urgent');

  const monthNow = Date.parse('2026-02-28T22:00:00Z');
  assert.equal(getCountdownText('2026-03-01T01:00:00Z', monthNow), 'còn 3 giờ');
});

test('mức khẩn: 4 mức và hai biên 3 ngày, 30 ngày', () => {
  assert.equal(getUrgencyInfo(NOW - 1, NOW).level, 'expired');
  assert.equal(getUrgencyInfo(NOW + 2 * DAY, NOW).level, 'urgent');
  assert.equal(getUrgencyInfo(NOW + 3 * DAY, NOW).level, 'week');
  assert.equal(getUrgencyInfo(NOW + 5 * DAY, NOW).level, 'week');
  assert.equal(getUrgencyInfo(NOW + 20 * DAY, NOW).level, 'month');
  assert.equal(getUrgencyInfo(NOW + 30 * DAY, NOW).level, 'open');
  assert.equal(getUrgencyInfo(null, NOW).level, 'unknown');
});

test('hiển thị giờ Việt Nam: 23:59 AoE thành 18:59 ngày hôm sau', () => {
  const aoe = '2026-11-10T23:59:59-12:00';
  assert.equal(formatTimeGMT7(aoe), '18:59 GMT+7');
  assert.equal(formatDateGMT7(aoe), '11/11/2026');
  assert.equal(formatTimeGMT7('không phải ngày'), '');
});

test('nhiều vòng: bỏ vòng đã qua, chọn vòng còn hạn', () => {
  const result = getNextSubmission(edition([
    { id: 'r1', label: 'Round 1', deadlines: [deadline('r1-paper', 'paper', NOW - 10 * DAY)] },
    { id: 'r2', label: 'Round 2', deadlines: [deadline('r2-paper', 'paper', NOW + 10 * DAY)] },
  ]), { now: NOW });
  assert.equal(result.status, 'upcoming');
  assert.equal(result.deadline.id, 'r2-paper');
  assert.equal(result.deadline.roundId, 'r2');
  assert.equal(result.futureDeadlines.length, 1);
});

test('abstract đã qua, paper còn hạn: kết quả theo từng kind', () => {
  const item = edition([{ id: 'r1', label: 'R1', deadlines: [
    deadline('r1-abstract', 'abstract', NOW - DAY),
    deadline('r1-paper', 'paper', NOW + 7 * DAY),
  ] }]);
  assert.equal(getNextSubmission(item, { kind: 'any', now: NOW }).deadline.id, 'r1-paper');
  const abstractOnly = getNextSubmission(item, { kind: 'abstract', now: NOW });
  assert.equal(abstractOnly.status, 'closed');
  assert.deepEqual(abstractOnly.futureDeadlines, []);
  assert.equal(getNextSubmission(item, { kind: 'paper', now: NOW }).status, 'upcoming');
});

test('mốc đúng bằng now bị coi là đã hết hạn', () => {
  const result = getNextSubmission(edition([
    { id: 'r1', label: 'R1', deadlines: [deadline('r1-paper', 'paper', NOW)] },
  ]), { now: NOW });
  assert.equal(result.status, 'closed');
  assert.deepEqual(result.futureDeadlines, []);
});

test('không có mốc đúng kind thì trạng thái là unknown', () => {
  const result = getNextSubmission(edition([
    { id: 'r1', label: 'R1', deadlines: [deadline('r1-paper', 'paper', NOW + DAY)] },
  ]), { kind: 'abstract', now: NOW });
  assert.deepEqual(result, { status: 'unknown', deadline: null, futureDeadlines: [] });
});

test('mốc TBA, ước lượng, chỉ có ngày không vào futureDeadlines', () => {
  const result = getNextSubmission(edition([{ id: 'r1', label: 'R1', deadlines: [
    { id: 'tba', type: 'paper', instant: null, precision: 'unknown', quality: 'tba' },
    deadline('est', 'paper', NOW + DAY, { quality: 'estimated' }),
    { id: 'date', type: 'paper', instant: null, precision: 'date', quality: 'unverified' },
  ] }]), { now: NOW });
  assert.equal(result.status, 'unknown');
  assert.deepEqual(result.futureDeadlines, []);
});

test('hai mốc cùng giờ: abstract đứng trước paper', () => {
  const result = getNextSubmission(edition([{ id: 'r1', label: 'R1', deadlines: [
    deadline('r1-paper', 'paper', NOW + DAY),
    deadline('r1-abstract', 'abstract', NOW + DAY),
  ] }]), { now: NOW });
  assert.equal(result.deadline.id, 'r1-abstract');
});

test('dữ liệu hỏng không làm hàm ném lỗi', () => {
  assert.equal(getNextSubmission(null, { now: NOW }).status, 'unknown');
  assert.equal(getNextSubmission({ rounds: [null, { deadlines: [null] }] }, { now: NOW }).status, 'unknown');
});

test('độ mới dữ liệu tính từ checkedAt, quá 30 ngày là cũ', () => {
  assert.equal(getStaleInfo(null, NOW).status, 'unverified-source');
  assert.equal(getStaleInfo('sai định dạng', NOW).status, 'unverified-source');
  assert.equal(getStaleInfo(iso(NOW), NOW).label, 'Đã kiểm nguồn hôm nay');
  assert.equal(getStaleInfo(iso(NOW - 30 * DAY), NOW).isStale, false);
  assert.equal(getStaleInfo(iso(NOW - 31 * DAY), NOW).isStale, true);
});
