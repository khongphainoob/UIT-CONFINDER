// Chủ: TV4. Gọi Gemini bằng fetch, bắt trả JSON theo schema.

/**
 * TODO(TV4-05):
 * - POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * - Khóa gửi qua header `x-goog-api-key`, không đặt trong URL (URL hay bị ghi vào log).
 * - generationConfig: { responseMimeType: 'application/json', responseSchema: schema }
 * - Hủy sau timeoutMs bằng AbortSignal.timeout(timeoutMs).
 * - Lỗi mạng, hết giờ, HTTP khác 200, JSON hỏng: throw aiUnavailable() trong errors.js.
 *
 * @param {{ apiKey: string, model: string }} gemini
 * @param {{ system: string, user: string, schema: object, timeoutMs: number }} request
 * @returns {Promise<unknown>} object JSON đã parse (chưa kiểm tra, nơi gọi tự kiểm tra)
 */
export async function generateJson(gemini, request) {
  void gemini;
  void request;
  throw new Error('TODO(TV4-05): chưa gọi Gemini');
}
