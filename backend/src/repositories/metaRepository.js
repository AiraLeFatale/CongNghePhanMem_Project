export function createMetaRepository(db) {
  return {
    getContentVersion() {
      return Number(db.prepare("SELECT value FROM meta WHERE key = 'content_version'").get().value);
    },
    bumpContentVersion() {
      db.prepare("UPDATE meta SET value = CAST(value AS INTEGER) + 1 WHERE key = 'content_version'").run();
      return this.getContentVersion();
    },
  };
}
