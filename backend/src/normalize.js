// Chủ: TV1. Chuẩn hóa địa điểm thành quốc gia và khu vực (TV1-01).
// Bảng tra nằm ở data/country-map.json. Logic này cũng phải đưa sang site/js/data-adapter.js
// để frontend lọc được khi chạy bằng snapshot.

/**
 * TODO(TV1-01): tra thành phố/quốc gia trong chuỗi place.
 * Ví dụ: "Hanoi, Vietnam" → { country: 'VN', region: 'vietnam' }
 *        "Ho Chi Minh City" → { country: 'VN', region: 'vietnam' }
 *        "Singapore EXPO" → { country: 'SG', region: 'sea' }
 *        "Virtual" hoặc không đoán được → { country: null, region: null }
 *
 * @param {string|null} place
 * @param {{ countries: Record<string, { region: string, names: string[] }>, cities: Record<string, string> }} map
 * @returns {{ country: string|null, region: string|null }}
 */
export function normalizePlace(place, map) {
  void place;
  void map;
  return { country: null, region: null };
}
