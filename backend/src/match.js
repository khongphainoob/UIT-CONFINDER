// Chủ: TV4. Ghép luồng 5 bước của QĐ8. Mỗi bước là một hàm riêng để test thay thế được.
import { aiUnavailable, notImplemented } from './errors.js';

/**
 * Luồng:
 * 0. Tra cache theo hash của { description, filters }                    TODO(TV4-06)
 * 1. Chưa có filters thì gọi Gemini phân tích câu hỏi thành bộ lọc         TODO(TV4-10)
 * 2. validateFilters (filters.js)                                         TV3-10a
 * 3. queryEditionIds (db.js); rỗng thì relaxFilters và lọc lại            TV1-05, TV3-10b
 * 4. rankByKeywords (retrieval.js) lấy 20 kỳ                              TV3-07
 * 5. Gemini chọn 5 kèm lý do; bỏ mọi ID không nằm trong 20 kỳ              TODO(TV4-04)
 *    Bước 5 lỗi thì trả 20 kết quả bước 4 kèm rerankFailed: true
 *
 * Kết quả trả về đúng shape ở mục 5.4:
 * { parsedFilters, relaxed, exploreUrl, results, cached, rerankFailed? }
 *
 * @param {{ description: string, filters: object|null }} input đã qua validateMatchBody
 * @param {{ config: object, catalog: object, db: object }} deps
 */
export async function runMatch(input, deps) {
  void input;
  if (!deps.config.gemini.apiKey || !deps.config.gemini.model) {
    throw aiUnavailable('Server chưa cấu hình Gemini.');
  }
  throw notImplemented('TV4-04 luồng gợi ý');
}
