import { buildLeafletHtml } from '../components/map/leafletHtml';

describe('Leaflet HTML', () => {
  it('nhúng Leaflet và script điều khiển hợp lệ cú pháp', () => {
    const html = buildLeafletHtml({ latitude: 10.76, longitude: 106.7 });
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts).toHaveLength(2);
    expect(scripts[0].length).toBeGreaterThan(100_000); // leaflet.js nhúng sẵn, không cần CDN
    for (const s of scripts) expect(() => new Function(s)).not.toThrow();
    expect(html).toContain('setView([10.76,106.7],16)');
  });
});
