// Đọc cấu hình từ biến môi trường một lần, các file khác chỉ nhận object config.
// Giới hạn tần suất lấy theo bảng 5.5 trong docs/t5-feedback-improvement-plan.md.

function toList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

const THINKING_LEVELS = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'];

export const DEFAULT_LIMITS = Object.freeze({
  conferencesPerMinute: 60,
  matchPerMinute: 5,
  matchPerDay: 20,
  bodyBytes: '10kb',
  descriptionMin: 20,
  descriptionMax: 1500,
  geminiTimeoutMs: 15_000,
  // Trần toàn hệ thống: mỗi yêu cầu gợi ý tốn tối đa 2 lượt gọi Gemini.
  aiDailyBudget: 300,
  aiMaxConcurrent: 4,
});

export function loadConfig(env = process.env) {
  const thinkingLevel = String(env.GEMINI_THINKING_LEVEL ?? '').toUpperCase();
  return {
    port: toInt(env.PORT, 3000),
    allowedOrigins: toList(env.ALLOWED_ORIGIN),
    trustProxy: toInt(env.TRUST_PROXY, 0),
    debugIp: env.DEBUG_IP === '1',
    gemini: {
      apiKey: env.GEMINI_API_KEY || '',
      model: env.GEMINI_MODEL || '',
      thinkingLevel: THINKING_LEVELS.includes(thinkingLevel) ? thinkingLevel : '',
    },
    limits: {
      ...DEFAULT_LIMITS,
      aiDailyBudget: toInt(env.AI_DAILY_BUDGET, DEFAULT_LIMITS.aiDailyBudget),
    },
  };
}
