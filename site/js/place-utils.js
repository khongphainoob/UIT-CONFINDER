// TV1: chuẩn hóa địa điểm tự do của CCFDDL thành quốc gia và khu vực. Hàm thuần, không DOM, không fetch.
// Dùng chung cho frontend (data-service.js, bộ lọc Khu vực trang Hội nghị) và backend (backend/src/normalize.js).

// Cây khu vực: chọn một khu vực là gồm cả các khu vực con. Thứ tự này là thứ tự hiển thị trong bộ lọc.
export const REGION_TREE = Object.freeze([
  { code: 'asia', label: 'Châu Á', children: [
    { code: 'vietnam', label: 'Việt Nam' },
    { code: 'sea', label: 'Đông Nam Á' },
    { code: 'east-asia', label: 'Đông Á' },
    { code: 'south-asia', label: 'Nam Á' },
    { code: 'west-asia', label: 'Tây Á – Trung Đông' },
  ] },
  { code: 'europe', label: 'Châu Âu', children: [] },
  { code: 'america', label: 'Châu Mỹ', children: [
    { code: 'north-america', label: 'Bắc Mỹ' },
    { code: 'latin-america', label: 'Mỹ Latinh – Caribe' },
  ] },
  { code: 'oceania', label: 'Châu Đại Dương', children: [] },
  { code: 'africa', label: 'Châu Phi', children: [] },
  { code: 'online', label: 'Trực tuyến', children: [] },
]);

// Khu vực "lá" của mỗi kỳ → mọi khu vực chứa nó. Việt Nam nằm trong Đông Nam Á, Đông Nam Á nằm trong châu Á.
export const REGION_PARENTS = Object.freeze({
  vietnam: ['vietnam', 'sea', 'asia'],
  sea: ['sea', 'asia'],
  'east-asia': ['east-asia', 'asia'],
  'south-asia': ['south-asia', 'asia'],
  'west-asia': ['west-asia', 'asia'],
  asia: ['asia'],
  europe: ['europe'],
  'north-america': ['north-america', 'america'],
  'latin-america': ['latin-america', 'america'],
  america: ['america'],
  oceania: ['oceania'],
  africa: ['africa'],
  online: ['online'],
});

export const REGION_CODES = Object.freeze(Object.keys(REGION_PARENTS));
export const REGION_LABELS = Object.freeze(Object.fromEntries(
  REGION_TREE.flatMap((node) => [[node.code, node.label], ...node.children.map((child) => [child.code, child.label])]),
));

// Tên viết thường, không dấu, chỉ chữ số và dấu cách (giống normalizeText).
export const COUNTRIES = Object.freeze({
  VN: { region: 'vietnam', names: ['vietnam', 'viet nam'] },
  SG: { region: 'sea', names: ['singapore'] },
  TH: { region: 'sea', names: ['thailand'] },
  MY: { region: 'sea', names: ['malaysia'] },
  ID: { region: 'sea', names: ['indonesia'] },
  PH: { region: 'sea', names: ['philippines'] },
  KH: { region: 'sea', names: ['cambodia'] },
  CN: { region: 'east-asia', names: ['china', 'p r china', 'prc'] },
  HK: { region: 'east-asia', names: ['hong kong', 'hong kong sar'] },
  MO: { region: 'east-asia', names: ['macau', 'macao'] },
  TW: { region: 'east-asia', names: ['taiwan'] },
  JP: { region: 'east-asia', names: ['japan'] },
  KR: { region: 'east-asia', names: ['korea', 'south korea', 'republic of korea'] },
  IN: { region: 'south-asia', names: ['india'] },
  IL: { region: 'west-asia', names: ['israel'] },
  AE: { region: 'west-asia', names: ['united arab emirates', 'uae'] },
  QA: { region: 'west-asia', names: ['qatar'] },
  SA: { region: 'west-asia', names: ['saudi arabia'] },
  TR: { region: 'europe', names: ['turkey', 'turkiye'] },
  US: { region: 'north-america', names: ['usa', 'u s a', 'united states', 'united state', 'us'] },
  CA: { region: 'north-america', names: ['canada'] },
  MX: { region: 'north-america', names: ['mexico'] },
  BR: { region: 'latin-america', names: ['brazil'] },
  AR: { region: 'latin-america', names: ['argentina'] },
  CL: { region: 'latin-america', names: ['chile'] },
  CO: { region: 'latin-america', names: ['colombia'] },
  CR: { region: 'latin-america', names: ['costa rica'] },
  PA: { region: 'latin-america', names: ['panama'] },
  DO: { region: 'latin-america', names: ['dominican republic'] },
  BS: { region: 'latin-america', names: ['bahamas'] },
  BB: { region: 'latin-america', names: ['barbados'] },
  GD: { region: 'latin-america', names: ['grenada'] },
  CW: { region: 'latin-america', names: ['curacao'] },
  KN: { region: 'latin-america', names: ['st kitts', 'saint kitts'] },
  GB: { region: 'europe', names: ['uk', 'united kingdom', 'great britain', 'england', 'scotland', 'wales'] },
  IE: { region: 'europe', names: ['ireland'] },
  DE: { region: 'europe', names: ['germany'] },
  FR: { region: 'europe', names: ['france'] },
  IT: { region: 'europe', names: ['italy'] },
  ES: { region: 'europe', names: ['spain'] },
  PT: { region: 'europe', names: ['portugal'] },
  NL: { region: 'europe', names: ['netherlands', 'the netherlands'] },
  BE: { region: 'europe', names: ['belgium'] },
  LU: { region: 'europe', names: ['luxembourg'] },
  CH: { region: 'europe', names: ['switzerland'] },
  AT: { region: 'europe', names: ['austria'] },
  DK: { region: 'europe', names: ['denmark'] },
  SE: { region: 'europe', names: ['sweden'] },
  NO: { region: 'europe', names: ['norway'] },
  FI: { region: 'europe', names: ['finland'] },
  IS: { region: 'europe', names: ['iceland'] },
  EE: { region: 'europe', names: ['estonia'] },
  LT: { region: 'europe', names: ['lithuania'] },
  PL: { region: 'europe', names: ['poland'] },
  CZ: { region: 'europe', names: ['czech republic', 'czechia'] },
  SK: { region: 'europe', names: ['slovakia'] },
  HU: { region: 'europe', names: ['hungary'] },
  SI: { region: 'europe', names: ['slovenia'] },
  HR: { region: 'europe', names: ['croatia'] },
  RS: { region: 'europe', names: ['serbia'] },
  RO: { region: 'europe', names: ['romania'] },
  GR: { region: 'europe', names: ['greece'] },
  CY: { region: 'europe', names: ['cyprus'] },
  MT: { region: 'europe', names: ['malta'] },
  AU: { region: 'oceania', names: ['australia'] },
  NZ: { region: 'oceania', names: ['new zealand'] },
  FJ: { region: 'oceania', names: ['fiji'] },
  MA: { region: 'africa', names: ['morocco'] },
  TN: { region: 'africa', names: ['tunisia'] },
  EG: { region: 'africa', names: ['egypt'] },
  ZA: { region: 'africa', names: ['south africa'] },
  RW: { region: 'africa', names: ['rwanda'] },
  GE: { region: 'europe', names: [] },
});

// Thành phố, bang không ghi kèm tên nước. Không thêm "ca" hay "georgia" vì trùng Canada/California và bang Georgia của Mỹ.
export const PLACES = Object.freeze({
  'hanoi': 'VN', 'ha noi': 'VN', 'ho chi minh city': 'VN', 'ho chi minh': 'VN', 'danang': 'VN', 'da nang': 'VN',
  'phu quoc': 'VN', 'hue': 'VN', 'taipei': 'TW', 'abu dhabi': 'AE', 'dubai': 'AE', 'paris': 'FR',
  'leuven': 'BE', 'santiago de compostela': 'ES', 'vancouver': 'CA', 'montreal': 'CA', 'toronto': 'CA', 'california': 'US',
  'colorado': 'US', 'louisiana': 'US', 'hawaii': 'US', 'maryland': 'US', 'florida': 'US', 'utah': 'US',
  'oregon': 'US', 'indiana': 'US', 'south carolina': 'US', 'philadelphia': 'US', 'los angeles': 'US', 'denver': 'US',
  'new york': 'US', 'seattle': 'US', 'boston': 'US', 'dc': 'US', 'san francisco': 'US', 'long beach': 'US',
  'san jose': 'US', 'palo alto': 'US', 'santa clara': 'US', 'stanford': 'US', 'san diego': 'US', 'antwerp': 'BE',
  'tbilisi': 'GE',
});

const ONLINE = /\b(virtual|online)\b/i;

// Chữ thường, bỏ dấu, mọi ký tự không phải chữ số thành dấu cách: "Türkiye" → "turkiye", "U.S.A." → "u s a".
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Dựng bảng tra một lần: [{ name, country }], tên dài xếp trước để "south africa" khớp trước "africa". */
export function createPlaceIndex({ countries = COUNTRIES, places = PLACES } = {}) {
  const entries = [];
  for (const [code, info] of Object.entries(countries)) {
    for (const name of info.names ?? []) entries.push({ name: normalizeText(name), country: code });
  }
  for (const [name, code] of Object.entries(places)) entries.push({ name: normalizeText(name), country: code });
  entries.sort((a, b) => b.name.length - a.name.length);
  const regions = Object.fromEntries(Object.entries(countries).map(([code, info]) => [code, info.region]));
  return { entries, regions };
}

/**
 * Tìm quốc gia trong chuỗi place, lấy chỗ khớp nằm sau cùng ("Thành phố, Bang, Quốc gia").
 * Không đoán: không khớp tên nào thì country = null; chuỗi ghi Virtual/Online thì region = 'online'.
 * @returns {{ country: string|null, region: string|null }}
 */
export function normalizePlace(place, index) {
  const text = ` ${normalizeText(place)} `;
  let best = null;
  for (const entry of index.entries) {
    const position = text.lastIndexOf(` ${entry.name} `);
    if (position !== -1 && (!best || position > best.position)) best = { position, country: entry.country };
  }
  if (best) return { country: best.country, region: index.regions[best.country] ?? null };
  return { country: null, region: ONLINE.test(String(place ?? '')) ? 'online' : null };
}

let defaultIndex;
// Gắn country/region vào từng edition, trả mảng mới (không sửa catalog gốc).
export function attachPlaceInfo(editions, index = (defaultIndex ??= createPlaceIndex())) {
  return editions.map((edition) => ({ ...edition, ...normalizePlace(edition.place, index) }));
}

// regionMatches('vietnam', 'asia') === true: kỳ ở Việt Nam thuộc châu Á.
export function regionMatches(editionRegion, wantedRegion) {
  if (!wantedRegion) return true;
  return (REGION_PARENTS[editionRegion] ?? []).includes(wantedRegion);
}

// Mọi khu vực lá nằm trong một khu vực: 'asia' → ['vietnam', 'sea', 'east-asia', 'south-asia', 'west-asia', 'asia'].
export function regionsWithin(region) {
  return Object.entries(REGION_PARENTS).filter(([, parents]) => parents.includes(region)).map(([leaf]) => leaf);
}
