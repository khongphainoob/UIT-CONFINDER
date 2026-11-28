// Chủ: TV4. Giới hạn lượt gọi Gemini cho CẢ HỆ THỐNG, bổ sung cho giới hạn theo IP.
// Giới hạn theo IP không chặn được kẻ tấn công dùng nhiều IP (botnet, proxy xoay vòng);
// trần theo ngày giữ quota miễn phí không bị đốt hết, trần đồng thời giữ server không bị dồn request treo.
import { HttpError } from './errors.js';

/**
 * @param {{ dailyLimit: number, maxConcurrent: number, now?: () => number }} options
 */
export function createAiBudget({ dailyLimit, maxConcurrent, now = Date.now }) {
  let day = '';
  let used = 0;
  let active = 0;

  return {
    // Gọi trước mỗi lần gọi Gemini; nhận lại hàm release để gọi trong finally.
    acquire() {
      const today = new Date(now()).toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        used = 0;
      }
      if (used >= dailyLimit) {
        throw new HttpError(503, 'AI_BUDGET_EXHAUSTED', 'Hôm nay hệ thống đã dùng hết lượt AI. Hãy dùng bộ lọc ở trang Hội nghị hoặc thử lại ngày mai.');
      }
      if (active >= maxConcurrent) {
        throw new HttpError(503, 'AI_BUSY', 'AI đang bận với nhiều yêu cầu. Hãy thử lại sau ít giây.', { retryAfter: 5 });
      }
      used += 1;
      active += 1;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          active -= 1;
        }
      };
    },
    snapshot() {
      return { day, used, active, dailyLimit, maxConcurrent };
    },
  };
}
