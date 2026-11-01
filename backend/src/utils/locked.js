/**
 * Tiện ích dùng chung cho điểm thuyết minh có phí.
 *
 * Website đang chạy chỉ trả bản xem trước (câu đầu) và ẩn audio của điểm chưa mua
 * ở /api/sync và /api/qr; nội dung đầy đủ chỉ có khi tải bằng token hợp lệ.
 * Hàm dưới đây áp dụng đúng quy tắc đó.
 */

// Lấy câu đầu tiên của đoạn thuyết minh (dừng ở . ! ? hoặc biến thể chữ Hán/Nhật).
export function firstSentence(text) {
  const s = String(text ?? '');
  const i = s.search(/[.!?。！？]/);
  return i >= 0 ? s.slice(0, i + 1).trim() : s.trim();
}

// Trả bản sao POI kèm cờ locked; nếu đang khoá thì rút gọn nội dung và bỏ audio.
export function maskLockedAudio(poi) {
  const locked = Number(poi?.price) > 0;
  if (!locked) return { ...poi, locked: false };
  return {
    ...poi,
    locked: true,
    translations: (poi.translations ?? []).map((t) => ({
      ...t,
      narration_text: firstSentence(t.narration_text),
      audio_url: null,
      audio_source: null,
    })),
  };
}
