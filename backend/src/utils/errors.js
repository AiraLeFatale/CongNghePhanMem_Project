export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, 'VALIDATION_ERROR', message, details);
export const unauthorized = (message = 'Chưa đăng nhập hoặc phiên đã hết hạn') => new AppError(401, 'UNAUTHORIZED', message);
export const notFound = (message = 'Không tìm thấy dữ liệu') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message) => new AppError(409, 'CONFLICT', message);
export const upstream = (message) => new AppError(502, 'UPSTREAM_ERROR', message);
