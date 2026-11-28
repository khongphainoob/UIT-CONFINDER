// TV4-04, TV4-06, TV4-10: luồng gợi ý 5 bước với Gemini giả và đồng hồ cố định.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextSubmission } from '../../site/js/deadline-utils.js';
import { createAiBudget } from '../src/ai-budget.js';
import { aiUnavailable } from '../src/errors.js';
import { orderByStatus, validateRerank } from '../src/match.js';
import { regionMatches } from '../src/normalize.js';
import { FIXED_NOW, PARSE_SECURITY_ASIA, candidatesOf, createTestServices, fakeGemini } from './helpers.js';

const QUESTION = 'Tôi làm bảo mật cho AI agent, phát hiện prompt injection, muốn nộp ở châu Á, CCF B trở lên.';

// Bước 5 giả: chọn 3 ứng viên đầu, kèm một ID bịa để kiểm tra backend loại bỏ.
function pickFirstThree(request) {
  const candidates = candidatesOf(request);
  return {
    results: [
      { id: 'bia-dat-2099', score: 99, reason: 'Hội nghị không tồn tại', matchedTopics: [] },
      ...candidates.slice(0, 3).map((candidate, i) => ({
        id: candidate.id, score: 90 - i * 10, reason: `Phù hợp ${candidate.acronym}`, matchedTopics: ['LLM security'],
      })),
    ],
  };
}

test('luồng đầy đủ: phân tích → lọc SQL → BM25 → xếp hạng, loại ID bịa', async () => {
  const gemini = fakeGemini([PARSE_SECURITY_ASIA, pickFirstThree]);
  const { matchService } = await createTestServices({ generate: gemini.generate });
  const result = await matchService.match({ description: QUESTION, filters: null });

  assert.equal(gemini.calls.length, 2);
  assert.ok(gemini.calls[0].user.includes('<request>'), 'câu hỏi nằm trong thẻ request');
  assert.equal(result.offTopic, false);
  assert.equal(result.cached, false);
  assert.deepEqual(result.parsedFilters, {
    region: 'asia', countries: [], ccfMin: 'B', coreMin: null, withinDays: null,
    kind: 'any', fields: ['SC'], keywords: ['llm security', 'prompt injection', 'adversarial machine learning'],
  });
  assert.equal(result.exploreUrl, 'conferences.html?field=SC&ccf=A&ccf=B&region=asia');

  // Mọi ứng viên gửi cho Gemini đều thỏa bộ lọc cứng.
  const candidates = candidatesOf(gemini.calls[1]);
  assert.ok(candidates.length > 0 && candidates.length <= 20);
  for (const candidate of candidates) {
    assert.ok(['A', 'B'].includes(candidate.ccf), `${candidate.acronym} ccf ${candidate.ccf}`);
    assert.equal(candidate.field, 'SC');
  }
  // Mỗi hội nghị chỉ xuất hiện một lần.
  assert.equal(new Set(candidates.map((c) => c.acronym)).size, candidates.length);

  assert.equal(result.results.length, 3);
  assert.ok(result.results.every((item) => item.id !== 'bia-dat-2099'));
  assert.ok(result.results.every((item) => item.edition && item.edition.id === item.id));
  assert.ok(regionMatches(result.results[0].edition.region, 'asia'), result.results[0].edition.region);
});

test('cache: hỏi lại cùng câu không gọi Gemini', async () => {
  const gemini = fakeGemini([PARSE_SECURITY_ASIA, pickFirstThree]);
  const { matchService } = await createTestServices({ generate: gemini.generate });
  const first = await matchService.match({ description: QUESTION, filters: null });
  const second = await matchService.match({ description: `  ${QUESTION}   `, filters: null });
  assert.equal(gemini.calls.length, 2);
  assert.equal(second.cached, true);
  assert.deepEqual(second.results.map((r) => r.id), first.results.map((r) => r.id));
});

test('gửi kèm filters (người dùng sửa chip) thì bỏ qua bước phân tích', async () => {
  const gemini = fakeGemini([pickFirstThree]);
  const { matchService } = await createTestServices({ generate: gemini.generate });
  const result = await matchService.match({
    description: QUESTION,
    filters: { region: 'europe', ccfMin: 'A', fields: ['SC'], keywords: ['privacy'] },
  });
  assert.equal(gemini.calls.length, 1);
  assert.equal(result.parsedFilters.region, 'europe');
  for (const candidate of candidatesOf(gemini.calls[0])) assert.equal(candidate.ccf, 'A');
});

test('câu lạc đề: trả rỗng, không chạy bước 5', async () => {
  const gemini = fakeGemini([{ ...PARSE_SECURITY_ASIA, offTopic: true }]);
  const { matchService } = await createTestServices({ generate: gemini.generate });
  const result = await matchService.match({ description: 'Viết cho tôi một bài thơ về mùa thu Hà Nội nhé', filters: null });
  assert.equal(gemini.calls.length, 1);
  assert.equal(result.offTopic, true);
  assert.deepEqual(result.results, []);
});

test('lọc ra rỗng thì nới dần và báo đã nới gì', async () => {
  const gemini = fakeGemini([pickFirstThree]);
  const { matchService } = await createTestServices({ generate: gemini.generate });
  // Không có hội nghị CCF A về bảo mật nào ở Việt Nam còn hạn trong 30 ngày.
  const result = await matchService.match({
    description: QUESTION,
    filters: { region: 'vietnam', ccfMin: 'A', withinDays: 30, fields: ['SC'], keywords: ['security'] },
  });
  assert.ok(result.relaxed.length > 0);
  assert.equal(result.relaxed[0], 'withinDays');
  assert.ok(result.results.length > 0);
});

test('bước 1 lỗi → 503 cho người dùng', async () => {
  const gemini = fakeGemini([aiUnavailable()]);
  const { matchService } = await createTestServices({ generate: gemini.generate });
  await assert.rejects(matchService.match({ description: QUESTION, filters: null }), { status: 503 });
});

test('bước 5 lỗi → vẫn trả kết quả BM25, đánh dấu rerankFailed, không lưu cache', async () => {
  const gemini = fakeGemini([PARSE_SECURITY_ASIA, aiUnavailable(), PARSE_SECURITY_ASIA, pickFirstThree]);
  const { matchService } = await createTestServices({ generate: gemini.generate });
  const result = await matchService.match({ description: QUESTION, filters: null });
  assert.equal(result.rerankFailed, true);
  assert.ok(result.results.length > 0 && result.results.length <= 5);
  assert.ok(result.results.every((item) => item.reason === ''));
  // Lần sau gọi lại Gemini đầy đủ vì kết quả lỗi không được cache.
  const again = await matchService.match({ description: QUESTION, filters: null });
  assert.equal(again.cached, false);
  assert.equal(gemini.calls.length, 4);
});

test('bước 5 trả toàn ID bịa → coi như lỗi, dùng BM25', async () => {
  const gemini = fakeGemini([PARSE_SECURITY_ASIA, { results: [{ id: 'khong-co', score: 100, reason: 'x', matchedTopics: [] }] }]);
  const { matchService } = await createTestServices({ generate: gemini.generate });
  const result = await matchService.match({ description: QUESTION, filters: null });
  assert.equal(result.rerankFailed, true);
});

test('lỗi lập trình (không phải lỗi AI) không bị nuốt', async () => {
  const gemini = fakeGemini([PARSE_SECURITY_ASIA, new TypeError('bug')]);
  const { matchService } = await createTestServices({ generate: gemini.generate });
  await assert.rejects(matchService.match({ description: QUESTION, filters: null }), TypeError);
});

test('validateRerank: kẹp điểm, cắt chữ, bỏ trùng, tối đa 5', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const raw = {
    results: [
      { id: 'a', score: 150, reason: 'x'.repeat(500), matchedTopics: ['t'.repeat(100), 1, ''] },
      { id: 'a', score: 50, reason: 'trùng' },
      { id: 'b', score: -3, reason: 7 },
      ...['c', 'd', 'e', 'f'].map((id) => ({ id, score: 10, reason: 'ok', matchedTopics: [] })),
    ],
  };
  const out = validateRerank(raw, ids);
  assert.deepEqual(out.map((item) => item.id), ['a', 'b', 'c', 'd', 'e']);
  assert.equal(out[0].score, 100);
  assert.equal(out[0].reason.length, 300);
  assert.deepEqual(out[0].matchedTopics, ['t'.repeat(60)]);
  assert.equal(out[1].score, 0);
  assert.equal(out[1].reason, '');
  assert.deepEqual(validateRerank(null, ids), []);
});

test('ngân sách AI: hết lượt trong ngày và quá số yêu cầu đồng thời', () => {
  let clock = Date.parse('2026-11-01T10:00:00Z');
  const budget = createAiBudget({ dailyLimit: 2, maxConcurrent: 1, now: () => clock });
  const release = budget.acquire();
  assert.throws(() => budget.acquire(), { code: 'AI_BUSY' });
  release();
  release(); // gọi hai lần không làm âm bộ đếm
  budget.acquire()();
  assert.throws(() => budget.acquire(), { code: 'AI_BUDGET_EXHAUSTED' });
  clock += 24 * 60 * 60 * 1000; // sang ngày mới
  assert.doesNotThrow(() => budget.acquire()());
});

test('hết ngân sách giữa chừng: bước 5 bị chặn thì vẫn trả BM25', async () => {
  const gemini = fakeGemini([PARSE_SECURITY_ASIA]);
  const { matchService } = await createTestServices({ generate: gemini.generate, env: { AI_DAILY_BUDGET: '1' } });
  const result = await matchService.match({ description: QUESTION, filters: null });
  assert.equal(result.rerankFailed, true);
  assert.equal(gemini.calls.length, 1);
});

test('không gợi ý kỳ cũ đã đóng: WSDM 2023 ở Singapore không tính là hội nghị ở Singapore', async () => {
  const gemini = fakeGemini([(request) => ({ results: [] })]);
  const { matchService, catalog } = await createTestServices({ generate: gemini.generate });
  await matchService.match({ description: QUESTION, filters: { countries: ['SG', 'JP'], fields: ['DB'], keywords: ['database'] } });
  const latest = new Map();
  for (const edition of catalog.editions) latest.set(edition.seriesKey, Math.max(latest.get(edition.seriesKey) ?? 0, edition.year));
  const sent = candidatesOf(gemini.calls[0]);
  assert.ok(sent.length > 0);
  for (const candidate of sent) {
    const edition = catalog.editions.find((e) => e.id === candidate.id);
    const status = getNextSubmission(edition, { now: FIXED_NOW }).status;
    assert.ok(status === 'upcoming' || edition.year === latest.get(edition.seriesKey), `${candidate.acronym} ${candidate.year}`);
    // AI không nhận trạng thái hay hạn nộp nên không thể nói sai về chúng
    assert.equal(candidate.status, undefined);
    assert.equal(candidate.nextDeadline, undefined);
  }
  assert.ok(!sent.some((c) => c.acronym === 'WSDM' && c.year === 2023));
});

test('bước 5 nhận ngày hôm nay và prompt cấm nhắc hạn trong lý do', async () => {
  const gemini = fakeGemini([PARSE_SECURITY_ASIA, pickFirstThree]);
  const { matchService } = await createTestServices({ generate: gemini.generate });
  await matchService.match({ description: QUESTION, filters: null });
  assert.ok(gemini.calls[1].user.startsWith('Today (UTC): 2026-11-01'));
  assert.match(gemini.calls[1].system, /Do NOT mention deadline/);
});

test('kết quả: hội nghị còn hạn đứng trước hội nghị đã đóng, giữ thứ tự AI trong từng nhóm', () => {
  const submissions = new Map([
    ['dong-1', { submission: { status: 'closed' } }],
    ['mo-1', { submission: { status: 'upcoming' } }],
    ['chua-ro', { submission: { status: 'unknown' } }],
    ['mo-2', { submission: { status: 'upcoming' } }],
  ]);
  const picks = ['dong-1', 'mo-1', 'chua-ro', 'mo-2'].map((id) => ({ id }));
  assert.deepEqual(orderByStatus(picks, submissions).map((p) => p.id), ['mo-1', 'mo-2', 'chua-ro', 'dong-1']);
});
