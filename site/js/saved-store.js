// TV4: chốt key/schema trong docs/contracts.md trước khi 3 người gọi.
// Storage API chỉ trả ID/trạng thái; chủ trang tự render HTML.
export function getSavedIds() {
  throw new Error('TODO TV4: getSavedIds chưa được hiện thực.');
}
// Trả { ok, saved, ids, error }; chỉ saved=true sau khi ghi thành công.
export function toggleSaved(editionId) {
  void editionId;
  throw new Error('TODO TV4: toggleSaved chưa được hiện thực.');
}
