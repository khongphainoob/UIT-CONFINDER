// TV1: hàm thuần, không document/localStorage/fetch. Dùng chung mọi trang.
// kind: 'any' | 'abstract' | 'paper'; now là số milliseconds.
// Trả { status: 'upcoming'|'unknown'|'closed', deadline, futureDeadlines }.
// deadline là object có ID (hoặc null), không phải chuỗi countdown.
export function getNextSubmission(edition, { kind = 'any', now = Date.now() } = {}) {
  void edition; void kind; void now;
  throw new Error('TODO TV1: getNextSubmission chưa được hiện thực.');
}
