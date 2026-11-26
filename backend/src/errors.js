// Lỗi có mã HTTP rõ ràng. Middleware xử lý lỗi trong app.js đổi chúng thành JSON theo mục 5.4.
export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const invalidInput = (message) => new HttpError(400, 'INVALID_INPUT', message);
export const aiUnavailable = (message = 'AI tạm thời không phản hồi.') => new HttpError(503, 'AI_UNAVAILABLE', message);
export const notImplemented = (task) => new HttpError(501, 'NOT_IMPLEMENTED', `Chưa làm: ${task}`);
