/** Tải file audio thuyết minh về máy để phát offline (expo-file-system, API File/Directory mới). */
import { Directory, File, Paths } from 'expo-file-system';
import { audioFileDelete, audioFileGet, audioFileList, audioFilePut } from './db';
import { resolveMediaUrl } from './syncLogic';
import type { Poi } from '../types';

const dir = () => new Directory(Paths.document, 'audio');

function fileNameFor(url: string): string {
  const base = url.split('?')[0].split('/').pop() || 'audio';
  const safe = base.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
  // Thêm băm ngắn của URL để tránh trùng tên.
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) | 0;
  return `${(h >>> 0).toString(36)}_${safe}`;
}

/** URI file đã tải nếu còn tồn tại trên máy. */
export async function getLocalAudio(url: string): Promise<string | null> {
  const uri = await audioFileGet(url);
  if (!uri) return null;
  try {
    if (new File(uri).exists) return uri;
  } catch {
    /* bỏ qua */
  }
  await audioFileDelete(url);
  return null;
}

export async function downloadAudio(url: string, apiBase: string): Promise<string> {
  const existing = await getLocalAudio(url);
  if (existing) return existing;
  const abs = resolveMediaUrl(url, apiBase);
  if (!abs) throw new Error('URL audio rỗng');
  const d = dir();
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  const target = new File(d, fileNameFor(url));
  if (target.exists) target.delete();
  const out = await File.downloadFileAsync(abs, target);
  await audioFilePut(url, out.uri, out.size ?? null);
  return out.uri;
}

export function collectAudioUrls(pois: Poi[], language?: string): string[] {
  const urls = new Set<string>();
  for (const p of pois)
    for (const t of p.translations)
      if (t.audio_url && (!language || t.language_code === language)) urls.add(t.audio_url);
  return [...urls];
}

export async function downloadAll(
  urls: string[],
  apiBase: string,
  onProgress?: (done: number, total: number, failed: number) => void,
): Promise<{ done: number; failed: number }> {
  let done = 0;
  let failed = 0;
  for (const u of urls) {
    try {
      await downloadAudio(u, apiBase);
    } catch {
      failed++;
    }
    done++;
    onProgress?.(done, urls.length, failed);
  }
  return { done, failed };
}

/** Xoá file audio không còn được nội dung tham chiếu. */
export async function pruneAudio(keepUrls: Set<string>): Promise<void> {
  for (const f of await audioFileList()) {
    if (keepUrls.has(f.url)) continue;
    try {
      const file = new File(f.local_uri);
      if (file.exists) file.delete();
    } catch {
      /* bỏ qua */
    }
    await audioFileDelete(f.url);
  }
}

export async function deleteAllAudio(): Promise<void> {
  try {
    const d = dir();
    if (d.exists) d.delete();
  } catch {
    /* bỏ qua */
  }
}

export async function audioCacheStats(): Promise<{ files: number; bytes: number }> {
  const list = await audioFileList();
  return { files: list.length, bytes: list.reduce((s, f) => s + (f.bytes ?? 0), 0) };
}
