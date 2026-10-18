import { config } from '../config.js';

export function createSyncService(repos) {
  return {
    version: () => ({ version: repos.meta.getContentVersion() }),
    /** Gói dữ liệu đầy đủ để app lưu offline vào SQLite. */
    snapshot() {
      return {
        version: repos.meta.getContentVersion(),
        generated_at: new Date().toISOString(),
        default_language: config.defaultLanguage,
        languages: config.languages,
        pois: repos.pois.listWithTranslations().map(({ created_at, ...p }) => p),
        tours: repos.tours.listWithPois(),
        // Cho phép app nhận diện QR khi không có mạng (UC2 E2)
        qrcodes: repos.qrcodes.listAll().map((q) => ({ payload: q.payload, poi_id: q.poi_id, label: q.label })),
      };
    },
  };
}
