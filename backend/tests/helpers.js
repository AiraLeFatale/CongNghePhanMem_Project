import { openDatabase } from '../src/db/database.js';
import { seed } from '../src/db/seed.js';
import { createApp } from '../src/app.js';

export const fakeTranslator = {
  provider: 'fake',
  translate: async (text, source, target) => `[${source}->${target}] ${text}`,
};
export const fakeTts = { provider: 'fake', synthesize: async () => Buffer.from('ID3fake-mp3') };

/** Dựng server thật trên cổng ngẫu nhiên với DB trong bộ nhớ. */
export async function startServer({ seeded = true, demo = false } = {}) {
  const db = openDatabase(':memory:');
  if (seeded) seed(db, { demo, adminPassword: 'admin123' });
  const { app } = createApp(db, { translator: fakeTranslator, tts: fakeTts, rateLimits: false });
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let token = null;

  async function call(method, path, body, { auth = true, raw = false } = {}) {
    const headers = {};
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(base + path, { method, headers, body: payload });
    if (raw) return res;
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  return {
    db, base, call,
    async login(username = 'admin', password = 'admin123') {
      const r = await call('POST', '/auth/login', { username, password }, { auth: false });
      token = r.body?.token;
      return r;
    },
    close: () => new Promise((r) => server.close(r)),
  };
}

export const validPoi = (over = {}) => ({
  name: 'Điểm thử',
  latitude: 10.76,
  longitude: 106.7,
  radius_m: 50,
  priority: 3,
  translations: [{ language_code: 'vi', title: 'Điểm thử', narration_text: 'Nội dung thử' }],
  ...over,
});
