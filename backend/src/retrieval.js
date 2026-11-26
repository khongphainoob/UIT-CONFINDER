// Chủ: TV3. BM25 chấm điểm theo từ khóa AI đã dịch và mở rộng (QĐ8, bước 4).

/**
 * TODO(TV3-07): BM25 (k1 = 1.2, b = 0.75) trên acronym + name + summary + topics,
 * bỏ từ dừng tiếng Anh, giữ cụm 2 chữ như "prompt injection".
 *
 * @param {object[]} editions các kỳ đã qua lọc SQL
 * @param {string[]} keywords từ khóa tiếng Anh do AI trả về
 * @param {{ limit?: number }} [options]
 * @returns {{ edition: object, score: number }[]} sắp giảm dần theo score
 */
export function rankByKeywords(editions, keywords, { limit = 20 } = {}) {
  void keywords;
  return editions.slice(0, limit).map((edition) => ({ edition, score: 0 }));
}
