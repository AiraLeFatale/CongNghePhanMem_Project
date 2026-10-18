import { createAuthService } from './authService.js';
import { createPoiService } from './poiService.js';
import { createTourService } from './tourService.js';
import { createQrService } from './qrService.js';
import { createSyncService } from './syncService.js';
import { createLogService } from './logService.js';
import { createAnalyticsService } from './analyticsService.js';
import { createTranslator, checkTranslateInput } from './translateService.js';
import { createTts } from './ttsService.js';

export function createServices(repos, { translator, tts } = {}) {
  return {
    auth: createAuthService(repos),
    pois: createPoiService(repos),
    tours: createTourService(repos),
    qr: createQrService(repos),
    sync: createSyncService(repos),
    logs: createLogService(repos),
    analytics: createAnalyticsService(repos),
    translator: withInputCheck(translator ?? createTranslator()),
    tts: tts ?? createTts(),
  };
}

// Kiểm tra đầu vào ở tầng service, dùng chung cho mọi nhà cung cấp dịch
function withInputCheck(t) {
  return {
    provider: t.provider,
    translate: async (text, source, target) => t.translate(checkTranslateInput(text, source, target), source, target),
  };
}
