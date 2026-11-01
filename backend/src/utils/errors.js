/**
 * Tầng tiện ích: định nghĩa lỗi nghiệp vụ có mã HTTP và mã lỗi riêng.
 * Middleware errorHandler dựa vào AppError để trả JSON lỗi thống nhất cho client.
 */

// Lỗi có chủ đích của ứng dụng: kèm status HTTP, mã lỗi nội bộ và chi tiết validate (nếu có).
export class AppError extends Error {
  // Lưu đủ status/code/details để errorHandler dựng JSON { error: { code, message, details } }.
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Các hàm tạo nhanh lỗi theo nhóm mã HTTP thường dùng (400/401/404/409/502).
export const badRequest = (message, details) => new AppError(400, 'VALIDATION_ERROR', message, details);
export const unauthorized = (message = 'Chưa đăng nhập hoặc phiên đã hết hạn') => new AppError(401, 'UNAUTHORIZED', message);
export const notFound = (message = 'Không tìm thấy dữ liệu') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message) => new AppError(409, 'CONFLICT', message);
export const upstream = (message) => new AppError(502, 'UPSTREAM_ERROR', message);
// 402: điểm có phí nhưng khách chưa có quyền nghe (chưa thanh toán/chưa xác nhận chuyển khoản).
export const paymentRequired = (message) => new AppError(402, 'PAYMENT_REQUIRED', message);
