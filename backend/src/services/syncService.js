/**
 * Tầng nghiệp vụ: đồng bộ nội dung cho app offline.
 * version() chỉ trả số phiên bản để app so sánh; snapshot() trả gói dữ liệu đầy đủ.
 */
import { config } from '../config.js';
import { maskLockedAudio } from '../utils/locked.js';

// Tạo service đồng bộ dựa trên content_version và dữ liệu POI/tour/QR trong DB.
export function createSyncService(repos) {
  return {
    // Endpoint nhẹ để app kiểm tra có cần tải lại dữ liệu hay không.
    version: () => ({ version: repos.meta.getContentVersion() }),
    /** Gói dữ liệu đầy đủ để app lưu offline vào SQLite. */
    snapshot() {
      return {
        // Kèm version + thời điểm sinh để app quyết định có ghi đè cache hay không.
        version: repos.meta.getContentVersion(),
        generated_at: new Date().toISOString(),
        default_language: config.defaultLanguage,
        languages: config.languages,
        // Bỏ created_at khỏi payload để gói đồng bộ gọn hơn; điểm có phí bị ẩn audio.
        pois: repos.pois.listWithTranslations().map(({ created_at, ...p }) => maskLockedAudio(p)),
        // Bật/tắt thanh toán để web biết có hiển thị nút mua hay không.
        payment_enabled: config.paymentEnabled,
        tours: repos.tours.listWithPois(),
        // Cho phép app nhận diện QR khi không có mạng (UC2 E2)
        qrcodes: repos.qrcodes.listAll().map((q) => ({ payload: q.payload, poi_id: q.poi_id, label: q.label })),
      };
    },
  };
}
