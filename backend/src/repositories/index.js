import { createAdminRepository } from './adminRepository.js';
import { createPoiRepository } from './poiRepository.js';
import { createTranslationRepository } from './translationRepository.js';
import { createQrRepository } from './qrRepository.js';
import { createTourRepository } from './tourRepository.js';
import { createLogRepository } from './logRepository.js';
import { createMetaRepository } from './metaRepository.js';
import { createAnalyticsRepository } from './analyticsRepository.js';

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
  };
}
