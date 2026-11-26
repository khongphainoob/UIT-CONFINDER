// Kiểm thử phần hàm thuần của đồng bộ Google Calendar (TV4). Phần OAuth/fetch cần thử trên trình duyệt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_MARKER,
  buildEventResource,
  collectSyncTargets,
  planSync,
  toEventId,
} from '../site/js/google-calendar-sync.js';

const NOW = Date.parse('2027-01-01T00:00:00Z');

const DEADLINE = {
  id: 'r1-paper',
  type: 'paper',
  instant: '2027-01-15T23:59:59-12:00',
  sourceText: '2027-01-15 23:59:59',
  timezone: 'AoE',
  precision: 'instant',
  quality: 'unverified',
};

const EDITION = {
  id: 'demo-2027',
  acronym: 'DEMO',
  year: 2027,
  place: 'Hà Nội, Việt Nam',
  websiteUrl: 'https://example.com',
  rounds: [{
    id: 'r1',
    label: 'Round 1',
    deadlines: [
      DEADLINE,
      { ...DEADLINE, id: 'r1-abstract', type: 'abstract', instant: '2026-12-01T23:59:59Z' }, // đã qua
      { ...DEADLINE, id: 'r1-tba', instant: null, precision: 'unknown', quality: 'tba' },
      { ...DEADLINE, id: 'r1-decision', type: 'decision', instant: '2027-03-01T00:00:00Z' },
    ],
  }],
};

test('event ID chỉ gồm base32hex, cố định và khác nhau giữa các mốc', () => {
  const id = toEventId('demo-2027', 'r1-paper');
  assert.match(id, /^[0-9a-v]{5,1024}$/);
  assert.equal(id, toEventId('demo-2027', 'r1-paper'));
  assert.notEqual(id, toEventId('demo-2027', 'r1-abstract'));
  assert.notEqual(toEventId('a', 'b/c'), toEventId('a/b', 'c'));
  assert.match(toEventId('hội-nghị', 'mốc'), /^[0-9a-v]+$/);
  assert.throws(() => toEventId('', 'x'));
});

test('event resource giữ đúng giờ UTC, nhắc trước và đánh dấu của web', () => {
  const resource = buildEventResource(EDITION, { ...DEADLINE, roundLabel: 'Round 1' });
  assert.equal(resource.start.dateTime, '2027-01-16T11:59:59.000Z');
  assert.equal(resource.end.dateTime, resource.start.dateTime);
  assert.equal(resource.summary, 'DEMO 2027 - Paper deadline');
  assert.match(resource.description, /Round: Round 1/);
  assert.equal(resource.location, 'Hà Nội, Việt Nam');
  assert.deepEqual(resource.source, { title: resource.summary, url: 'https://example.com' });
  assert.deepEqual(resource.reminders.overrides.map((r) => r.minutes), [1440, 60]);
  assert.equal(resource.extendedProperties.private.app, APP_MARKER);
  assert.equal(resource.transparency, 'transparent');
});

test('event resource từ chối mốc TBA/Estimated giống ICS', () => {
  assert.throws(() => buildEventResource(EDITION, { ...DEADLINE, quality: 'estimated' }), /Estimated/);
  assert.throws(() => buildEventResource(EDITION, { ...DEADLINE, precision: 'date' }), /giờ chính xác/);
});

test('bỏ websiteUrl không phải http(s) khỏi source', () => {
  const resource = buildEventResource({ ...EDITION, websiteUrl: 'javascript:alert(1)' }, DEADLINE);
  assert.equal('source' in resource, false);
});

test('chỉ đồng bộ mốc nộp bài còn hạn và đủ chính xác', () => {
  const { targets } = collectSyncTargets([EDITION], NOW);
  assert.deepEqual(targets.map((t) => t.deadline.id), ['r1-paper']);
  assert.deepEqual(collectSyncTargets(null, NOW).targets, []);
});

test('kế hoạch đồng bộ: thêm mới, cập nhật, giữ nguyên và gỡ mốc đã bỏ lưu', () => {
  const make = (deadlineId, instant) => ({
    resource: buildEventResource(EDITION, { ...DEADLINE, id: deadlineId, instant }),
  });
  const keep = make('keep', '2027-02-01T00:00:00Z');
  const moved = make('moved', '2027-02-02T00:00:00Z');
  const fresh = make('fresh', '2027-02-03T00:00:00Z');
  const existing = [
    { ...keep.resource, start: { dateTime: '2027-02-01T07:00:00+07:00' } }, // cùng thời điểm, khác cách viết
    { ...moved.resource, start: { dateTime: '2027-01-30T00:00:00Z' } },
    { id: 'unsaved', summary: 'OLD 2027 - Paper deadline', start: { dateTime: '2027-02-05T00:00:00Z' } },
  ];
  const plan = planSync([keep, moved, fresh, fresh], existing);
  assert.equal(plan.unchanged, 1);
  assert.deepEqual(plan.toUpdate, [moved]);
  assert.deepEqual(plan.toInsert, [fresh]);
  assert.deepEqual(plan.toDelete.map((e) => e.id), ['unsaved']);
});
