// TV3-07: BM25 theo từ khóa AI.
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRetrievalIndex, rankByKeywords, tokenize } from '../src/retrieval.js';
import { getCatalog } from './helpers.js';

test('tokenize bỏ từ dừng và từ chung chung trong tên hội nghị', () => {
  assert.deepEqual(tokenize('International Conference on Software Testing'), ['software', 'testing']);
});

test('không từ khóa nào khớp thì giữ thứ tự đầu vào', () => {
  const editions = ['a', 'b', 'c'].map((key) => ({ id: key, seriesKey: key, acronym: key.toUpperCase(), name: 'Alpha', fields: [] }));
  const index = createRetrievalIndex(editions);
  const ranked = rankByKeywords(index, editions, ['quantum']);
  assert.deepEqual(ranked.map((item) => item.edition.id), ['a', 'b', 'c']);
  assert.ok(ranked.every((item) => item.score === 0));
});

test('cụm từ liền nhau được cộng điểm hơn từ rời', () => {
  const editions = [
    { id: 'rời', seriesKey: 'r', acronym: 'R', name: 'Injection attacks and prompt design', fields: [] },
    { id: 'liền', seriesKey: 'l', acronym: 'L', name: 'Prompt injection attacks and design', fields: [] },
  ];
  const ranked = rankByKeywords(createRetrievalIndex(editions), editions, ['prompt injection']);
  assert.equal(ranked[0].edition.id, 'liền');
});

describe('dữ liệu thật', () => {
  let editions;
  let index;
  // Mỗi hội nghị lấy kỳ mới nhất, giống bước pickOnePerSeries.
  before(async () => {
    const catalog = await getCatalog();
    const latest = new Map();
    for (const edition of catalog.editions) {
      const current = latest.get(edition.seriesKey);
      if (!current || edition.year > current.year) latest.set(edition.seriesKey, edition);
    }
    editions = [...latest.values()];
    index = createRetrievalIndex(catalog.editions);
  });

  const top = (keywords, n = 5) => rankByKeywords(index, editions, keywords, { limit: n }).map((item) => item.edition.acronym);

  test('"computer vision" đưa CVPR, ICCV, ECCV vào top 8', () => {
    const result = top(['computer vision'], 8);
    for (const acronym of ['CVPR', 'ICCV', 'ECCV']) assert.ok(result.includes(acronym), `${acronym} trong ${result}`);
  });

  // Giới hạn đã biết: chỉ có tên hội nghị nên "recognition" kéo các hội nghị nhận dạng mẫu lên trên ICCV.
  // Bước 5 (Gemini xếp hạng lại) và topics từ CFP (TV1-07/08) là phần xử lý chuyện này.
  test('giới hạn: thêm "image recognition" thì hội nghị nhận dạng mẫu vượt lên', () => {
    const result = top(['computer vision', 'image recognition'], 5);
    assert.ok(result.includes('CVPR'));
    assert.ok(!result.includes('ICCV'), 'nếu test này hỏng nghĩa là BM25 đã tốt hơn, cập nhật lại docs');
  });

  test('"software testing" ra ISSTA hoặc ICST trong top 5', () => {
    const result = top(['software testing', 'test generation']);
    assert.ok(result.some((acronym) => ['ISSTA', 'ICST'].includes(acronym)), result.join(', '));
  });

  test('"database" + "data management" ra SIGMOD hoặc VLDB trong top 10', () => {
    const result = top(['database systems', 'data management'], 10);
    assert.ok(result.some((acronym) => ['SIGMOD', 'VLDB'].includes(acronym)), result.join(', '));
  });

  test('gõ đúng tên viết tắt thì hội nghị đó đứng đầu', () => {
    assert.equal(top(['cvpr'])[0], 'CVPR');
  });
});
