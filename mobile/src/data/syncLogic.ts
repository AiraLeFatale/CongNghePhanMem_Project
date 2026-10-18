/** Logic đồng bộ thuần (không I/O) — tách riêng để kiểm thử. */
import type { Poi, QrMapping, SyncBundle, Tour } from '../types';

export type SyncPlan = 'download' | 'skip';

/** Tăng khi định dạng dữ liệu lưu trên máy đổi (2 = có bảng QR offline) → buộc tải lại toàn bộ. */
export const SYNC_FORMAT = 2;

/** Có cần tải lại gói /api/sync không? */
export function planSync(
  localVersion: number | null,
  remoteVersion: number,
  hasLocalData: boolean,
  localFormat: number = SYNC_FORMAT,
): SyncPlan {
  if (!hasLocalData || localVersion == null || localFormat < SYNC_FORMAT) return 'download';
  return localVersion === remoteVersion ? 'skip' : 'download';
}

export interface BundleDiff {
  added: number[];
  updated: number[];
  removed: number[];
  /** URL audio không còn được tham chiếu → xoá file đã tải. */
  removedAudio: string[];
  /** URL audio mới hoặc đổi → cần tải (nếu người dùng bật tải offline). */
  newAudio: string[];
  toursChanged: boolean;
}

const audioUrls = (pois: Poi[]) =>
  new Set(pois.flatMap((p) => p.translations.map((t) => t.audio_url).filter((u): u is string => !!u)));

const poiSignature = (p: Poi) =>
  JSON.stringify([
    p.name,
    p.address,
    p.latitude,
    p.longitude,
    p.radius_m,
    p.priority,
    p.image_url,
    [...p.translations]
      .sort((a, b) => a.language_code.localeCompare(b.language_code))
      .map((t) => [t.language_code, t.title, t.narration_text, t.audio_url]),
  ]);

const tourSignature = (tours: Tour[]) =>
  JSON.stringify([...tours].sort((a, b) => a.id - b.id).map((t) => [t.id, t.name, t.description, t.poi_ids]));

export function diffBundles(oldPois: Poi[], oldTours: Tour[], next: SyncBundle): BundleDiff {
  const oldById = new Map(oldPois.map((p) => [p.id, p]));
  const newById = new Map(next.pois.map((p) => [p.id, p]));
  const added: number[] = [];
  const updated: number[] = [];
  const removed: number[] = [];
  for (const p of next.pois) {
    const o = oldById.get(p.id);
    if (!o) added.push(p.id);
    else if (poiSignature(o) !== poiSignature(p)) updated.push(p.id);
  }
  for (const id of oldById.keys()) if (!newById.has(id)) removed.push(id);
  const oldAudio = audioUrls(oldPois);
  const newAudioSet = audioUrls(next.pois);
  return {
    added,
    updated,
    removed,
    removedAudio: [...oldAudio].filter((u) => !newAudioSet.has(u)),
    newAudio: [...newAudioSet].filter((u) => !oldAudio.has(u)),
    toursChanged: tourSignature(oldTours) !== tourSignature(next.tours),
  };
}

/** Kiểm tra cấu trúc gói đồng bộ; loại POI hỏng thay vì làm hỏng cả lần đồng bộ. */
export function validateBundle(raw: unknown): SyncBundle {
  if (!raw || typeof raw !== 'object') throw new Error('Gói đồng bộ không hợp lệ');
  const b = raw as Record<string, unknown>;
  const version = Number(b.version);
  if (!Number.isFinite(version)) throw new Error('Gói đồng bộ thiếu version');
  if (!Array.isArray(b.pois) || !Array.isArray(b.tours)) throw new Error('Gói đồng bộ thiếu pois/tours');
  const pois: Poi[] = (b.pois as any[])
    .filter(
      (p) =>
        p &&
        Number.isInteger(p.id) &&
        Number.isFinite(Number(p.latitude)) &&
        Number.isFinite(Number(p.longitude)) &&
        Number(p.radius_m) > 0,
    )
    .map((p) => ({
      id: p.id,
      name: String(p.name ?? ''),
      address: p.address ?? null,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      radius_m: Number(p.radius_m),
      priority: Number.isFinite(Number(p.priority)) ? Number(p.priority) : 1,
      image_url: p.image_url ?? null,
      updated_at: p.updated_at ?? null,
      translations: Array.isArray(p.translations)
        ? p.translations
            .filter((t: any) => t && typeof t.language_code === 'string')
            .map((t: any) => ({
              language_code: t.language_code,
              title: t.title ?? null,
              narration_text: t.narration_text ?? null,
              audio_url: t.audio_url ?? null,
              audio_source: t.audio_source ?? null,
            }))
        : [],
    }));
  const poiIds = new Set(pois.map((p) => p.id));
  const tours: Tour[] = (b.tours as any[])
    .filter((t) => t && Number.isInteger(t.id))
    .map((t) => ({
      id: t.id,
      name: String(t.name ?? ''),
      description: t.description ?? null,
      updated_at: t.updated_at ?? null,
      poi_ids: Array.isArray(t.poi_ids) ? t.poi_ids.filter((id: unknown) => poiIds.has(id as number)) : [],
    }));
  const qrcodes: QrMapping[] = Array.isArray(b.qrcodes)
    ? (b.qrcodes as any[])
        .filter((q) => q && typeof q.payload === 'string' && q.payload && poiIds.has(Number(q.poi_id)))
        .map((q) => ({ payload: q.payload, poi_id: Number(q.poi_id), label: q.label ?? null }))
    : [];
  return {
    version,
    qrcodes,
    generated_at: typeof b.generated_at === 'string' ? b.generated_at : undefined,
    default_language: typeof b.default_language === 'string' ? b.default_language : 'vi',
    languages: Array.isArray(b.languages) ? (b.languages as any[]) : undefined,
    pois,
    tours,
  };
}

/** Ghép URL tương đối /uploads/... với địa chỉ máy chủ. URL tuyệt đối giữ nguyên. */
export function resolveMediaUrl(url: string | null | undefined, apiBase: string): string | null {
  if (!url) return null;
  if (/^(https?:|file:|content:|data:)/i.test(url)) return url;
  const base = apiBase.replace(/\/+$/, '').replace(/\/api$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}
