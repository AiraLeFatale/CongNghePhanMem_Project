/**
 * Tầng repository: đọc/ghi khoá meta trong DB.
 * Hiện dùng cho content_version - số phiên bản nội dung để app biết khi nào cần đồng bộ lại.
 */

// Tạo repository meta; bảng meta lưu key/value dạng TEXT.
export function createMetaRepository(db) {
  return {
    // Đọc content_version và ép về number (DB lưu dạng chuỗi).
    getContentVersion() {
      return Number(db.prepare("SELECT value FROM meta WHERE key = 'content_version'").get().value);
    },
    // Tăng content_version lên 1 (mỗi khi nội dung thay đổi) và trả về giá trị mới.
    bumpContentVersion() {
      db.prepare("UPDATE meta SET value = CAST(value AS INTEGER) + 1 WHERE key = 'content_version'").run();
      return this.getContentVersion();
    },
  };
}
