// Chủ: TV4 (TV4-05). Gọi Gemini generateContent qua REST, bắt trả JSON theo JSON Schema.
// Tài liệu: https://ai.google.dev/api/generate-content (GenerationConfig.responseJsonSchema).
import { HttpError, aiUnavailable } from './errors.js';

export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

// Lỗi phía Gemini: ghi log ở server, người dùng chỉ thấy thông báo chung (không lộ chi tiết, không lộ khóa).
function fail(message, detail) {
  console.warn(`[gemini] ${message}${detail ? `: ${detail}` : ''}`);
  return aiUnavailable();
}

/**
 * @param {{ apiKey: string, model: string, thinkingLevel?: string }} gemini
 * @param {{ system: string, user: string, schema: object, timeoutMs: number,
 *           temperature?: number, maxOutputTokens?: number }} request
 * @param {{ fetchImpl?: typeof fetch }} [options] cho phép test thay fetch
 * @returns {Promise<unknown>} JSON đã parse; nơi gọi tự kiểm tra lại bằng validate riêng
 */
export async function generateJson(gemini, request, { fetchImpl = fetch } = {}) {
  if (!gemini.apiKey || !gemini.model) throw aiUnavailable('Server chưa cấu hình Gemini.');
  if (!/^[a-z0-9.-]+$/i.test(gemini.model)) throw fail('Tên model không hợp lệ', gemini.model);

  const generationConfig = {
    responseMimeType: 'application/json',
    responseJsonSchema: request.schema,
    temperature: request.temperature ?? 0.2,
    maxOutputTokens: request.maxOutputTokens ?? 2048,
  };
  // Chỉ model Gemini 3 trở lên nhận thinkingLevel; để trống thì dùng mặc định của model.
  if (gemini.thinkingLevel) generationConfig.thinkingConfig = { thinkingLevel: gemini.thinkingLevel };

  let response;
  try {
    response = await fetchImpl(`${GEMINI_ENDPOINT}/${gemini.model}:generateContent`, {
      method: 'POST',
      // Khóa đi trong header, không đặt trong URL vì URL hay bị ghi vào log của proxy.
      headers: { 'content-type': 'application/json', 'x-goog-api-key': gemini.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: 'user', parts: [{ text: request.user }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(request.timeoutMs),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw fail('Hết thời gian chờ');
    throw fail('Lỗi mạng', error.message);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw fail(`HTTP ${response.status}`, body.slice(0, 300));
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw fail('Phản hồi không phải JSON');
  }

  if (data?.promptFeedback?.blockReason) {
    throw new HttpError(422, 'AI_BLOCKED', 'Nội dung bị bộ lọc an toàn của AI chặn. Hãy viết lại mô tả đề tài.');
  }
  const candidate = data?.candidates?.[0];
  if (!candidate || candidate.finishReason !== 'STOP') {
    throw fail('Không có kết quả hoàn chỉnh', candidate?.finishReason ?? 'không có candidate');
  }
  const text = (candidate.content?.parts ?? []).map((part) => part.text ?? '').join('');
  try {
    return JSON.parse(text);
  } catch {
    throw fail('JSON của model bị hỏng', text.slice(0, 200));
  }
}
