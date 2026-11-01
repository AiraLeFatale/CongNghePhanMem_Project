/**
 * Tầng repository gốc: khởi tạo tất cả repository con trên cùng một connection SQLite.
 * Chỉ nơi này biết cách "lắp ghép" các bảng; tầng service nhận object repos đã sẵn sàng.
 */
import { createAdminRepository } from './adminRepository.js';
import { createPoiRepository } from './poiRepository.js';
import { createTranslationRepository } from './translationRepository.js';
import { createQrRepository } from './qrRepository.js';
import { createTourRepository } from './tourRepository.js';
import { createLogRepository } from './logRepository.js';
import { createMetaRepository } from './metaRepository.js';
import { createAnalyticsRepository } from './analyticsRepository.js';
import { createPaymentRepository } from './paymentRepository.js';

// Trả về object gồm các repository theo tên nghiệp vụ (admins, pois, tours...).
export function createRepositories(db) {
  return {
    admins: createAdminRepository(db),
    pois: createPoiRepository(db),
    translations: createTranslationRepository(db),
    qrcodes: createQrRepository(db),
    tours: createTourRepository(db),
    logs: createLogRepository(db),
    meta: createMetaRepository(db),
    analytics: createAnalyticsRepository(db),
    payments: createPaymentRepository(db),
  };
}
