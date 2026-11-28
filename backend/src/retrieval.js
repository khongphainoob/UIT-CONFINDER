// Chủ: TV3 (TV3-07). BM25 chấm điểm theo từ khóa AI đã dịch và mở rộng (QĐ8, bước 4).
// Chỉ mục dựng một lần theo chuỗi hội nghị (seriesKey): các năm của cùng hội nghị có cùng văn bản,
// đếm theo kỳ sẽ làm hội nghị lâu năm có trọng số IDF lệch.
import { normalizeText } from './normalize.js';

const K1 = 1.2;
const B = 0.75;
const PHRASE_BONUS = 0.5;  // cộng thêm khi cả cụm "prompt injection" xuất hiện liền nhau
const ACRONYM_BONUS = 10;  // người dùng gõ đúng tên viết tắt (CVPR) thì đưa lên đầu

// Từ mô tả lĩnh vực bằng tiếng Anh: khi chưa crawl được CFP, tên hội nghị quá ngắn để BM25 bắt được đề tài.
export const FIELD_TERMS = Object.freeze({
  AI: 'artificial intelligence machine learning deep learning neural networks natural language processing computer vision reasoning',
  CG: 'computer graphics multimedia visualization image video rendering',
  CT: 'theory algorithms computational complexity logic formal methods',
  DB: 'database data management data mining information retrieval query',
  DS: 'distributed systems parallel computing computer architecture storage operating systems high performance',
  HI: 'human computer interaction user interface ubiquitous accessibility',
  MX: 'interdisciplinary emerging bioinformatics',
  NW: 'computer networks networking wireless mobile communication internet',
  SC: 'security privacy cryptography network security',
  SE: 'software engineering programming languages testing verification',
});

// Từ quá phổ biến trong tên hội nghị, không giúp phân biệt đề tài.
const STOPWORDS = new Set(`a an and are as at be by for from in into is it of on or the to with via about
  conference international symposium workshop annual proceedings ieee acm joint meeting research
  using based toward towards new`.split(/\s+/));

export function tokenize(text) {
  return normalizeText(text).split(' ').filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function documentText(edition) {
  const field = edition.fields?.[0];
  return [
    edition.acronym,
    edition.name,
    edition.summary,
    ...(Array.isArray(edition.topics) ? edition.topics : []),
    FIELD_TERMS[field] ?? '',
  ].filter(Boolean).join(' ');
}

/**
 * @param {object[]} editions toàn bộ catalog (đã có summary/topics nếu crawl xong)
 */
export function createRetrievalIndex(editions) {
  const documents = new Map();
  for (const edition of editions) {
    if (documents.has(edition.seriesKey)) continue;
    const text = documentText(edition);
    const tokens = tokenize(text);
    const frequencies = new Map();
    for (const token of tokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    documents.set(edition.seriesKey, {
      length: tokens.length,
      frequencies,
      phraseText: ` ${tokens.join(' ')} `,
      acronym: normalizeText(edition.acronym),
    });
  }

  const documentFrequency = new Map();
  let totalLength = 0;
  for (const doc of documents.values()) {
    totalLength += doc.length;
    for (const token of doc.frequencies.keys()) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }
  const count = documents.size;
  const idf = (token) => {
    const df = documentFrequency.get(token) ?? 0;
    return Math.log(1 + (count - df + 0.5) / (df + 0.5));
  };
  return { documents, idf, averageLength: count ? totalLength / count : 0 };
}

function scoreDocument(index, doc, queryTokens, phrases, acronyms) {
  let score = 0;
  const matched = [];
  for (const token of queryTokens) {
    const tf = doc.frequencies.get(token) ?? 0;
    if (!tf) continue;
    matched.push(token);
    const norm = 1 - B + B * (doc.length / (index.averageLength || 1));
    score += index.idf(token) * ((tf * (K1 + 1)) / (tf + K1 * norm));
  }
  for (const phrase of phrases) {
    if (doc.phraseText.includes(` ${phrase.join(' ')} `)) {
      score += PHRASE_BONUS * phrase.reduce((sum, token) => sum + index.idf(token), 0);
    }
  }
  if (acronyms.has(doc.acronym)) score += ACRONYM_BONUS;
  return { score, matched };
}

/**
 * Chấm điểm các kỳ đã qua lọc SQL theo danh sách từ khóa AI trả về.
 * Không từ khóa nào khớp thì giữ nguyên thứ tự đầu vào (đã xếp còn hạn trước) với score 0.
 *
 * @param {ReturnType<typeof createRetrievalIndex>} index
 * @param {object[]} editions
 * @param {string[]} keywords
 * @returns {{ edition: object, score: number, matchedTerms: string[] }[]}
 */
export function rankByKeywords(index, editions, keywords, { limit = 20 } = {}) {
  const phrases = keywords.map(tokenize).filter((tokens) => tokens.length);
  const queryTokens = [...new Set(phrases.flat())];
  const multiWord = phrases.filter((tokens) => tokens.length > 1);
  const acronyms = new Set(keywords.map(normalizeText));

  const scored = editions.map((edition, position) => {
    const doc = index.documents.get(edition.seriesKey);
    const { score, matched } = doc ? scoreDocument(index, doc, queryTokens, multiWord, acronyms) : { score: 0, matched: [] };
    return { edition, score: Math.round(score * 1000) / 1000, matchedTerms: matched, position };
  });
  scored.sort((a, b) => b.score - a.score || a.position - b.position);
  return scored.slice(0, limit).map(({ position, ...item }) => item);
}
