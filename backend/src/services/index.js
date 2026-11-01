/**
 * Tầng nghiệp vụ gốc: khởi tạo tất cả service và tiêm repository vào từng service.
 * Nơi duy nhất quyết định provider dịch/TTS mặc định; test có thể truyền translator/tts giả.
 */
import { createAuthService } from './authService.js';
import { createPoiService } from './poiService.js';
import { createTourService } from './tourService.js';
import { createQrService } from './qrService.js';
import { createSyncService } from './syncService.js';
import { createLogService } from './logService.js';
import { createAnalyticsService } from './analyticsService.js';
import { createTranslator, checkTranslateInput } from './translateService.js';
import { createTts } from './ttsService.js';
import { createAutoService } from './autoService.js';
import { createOrderService } from './orderService.js';
import { createLiveService } from './liveService.js';
import { config } from '../config.js';

// Trả về object service theo tên nghiệp vụ; translator được bọc thêm validate đầu vào.
export function createServices(repos, { translator, tts, autoOnSave } = {}) {
  const tr = withInputCheck(translator ?? createTranslator());
  const ttsImpl = tts ?? createTts();
  const auto = createAutoService(repos, { translator: tr, tts: ttsImpl });
  // Khi test inject provider giả thì mặc định không tự chạy nền (tránh thay đổi dữ liệu bất đồng bộ).
  const runAutoOnSave = autoOnSave ?? (!translator && !tts && config.autoTranslateOnSave);
  return {
    auth: createAuthService(repos),
    pois: createPoiService(repos, { auto, autoOnSave: runAutoOnSave }),
    tours: createTourService(repos),
    qr: createQrService(repos),
    sync: createSyncService(repos),
    logs: createLogService(repos),
    analytics: createAnalyticsService(repos),
    orders: createOrderService(repos),
    live: createLiveService(repos),
    auto,
    translator: tr,
    tts: ttsImpl,
  };
}

// Kiểm tra đầu vào ở tầng service, dùng chung cho mọi nhà cung cấp dịch
// Nhờ vậy provider bên ngoài không phải tự validate text/ngôn ngữ.
function withInputCheck(t) {
  return {
    provider: t.provider,
    translate: async (text, source, target) => t.translate(checkTranslateInput(text, source, target), source, target),
  };
}
