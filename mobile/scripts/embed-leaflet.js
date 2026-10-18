/**
 * Nhúng Leaflet (JS + CSS) vào một module TS để bản đồ WebView hiển thị được cả khi offline
 * (chỉ thiếu ảnh nền bản đồ, các vòng POI vẫn hiện). Chạy: npm run gen:leaflet
 */
const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname, '..', 'node_modules', 'leaflet', 'dist');
const js = fs.readFileSync(path.join(dist, 'leaflet.js'), 'utf8');
const css = fs.readFileSync(path.join(dist, 'leaflet.css'), 'utf8');
const version = require(path.join(dist, '..', 'package.json')).version;
const out = path.join(__dirname, '..', 'src', 'components', 'map', 'leafletAssets.generated.ts');
fs.writeFileSync(
  out,
  `/* eslint-disable */\n// Sinh tự động bởi scripts/embed-leaflet.js từ leaflet@${version} (BSD-2-Clause). Không sửa tay.\n` +
    `export const LEAFLET_VERSION = ${JSON.stringify(version)};\n` +
    `export const LEAFLET_JS = ${JSON.stringify(js)};\n` +
    `export const LEAFLET_CSS = ${JSON.stringify(css)};\n`,
);
console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
