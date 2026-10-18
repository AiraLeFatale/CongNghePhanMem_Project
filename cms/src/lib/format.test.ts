import { describe, expect, it } from 'vitest';
import { fillDaily, formatDate, formatDuration, hourlyToLocal } from './format';
import { safeStorage, tokenStore } from './storage';
import { reportSheets } from './exportExcel';
import { slugify } from './qr';

describe('format', () => {
  it('formatDuration', () => {
    expect(formatDuration(42)).toBe('42 giây');
    expect(formatDuration(95)).toBe('1 phút 35 giây');
    expect(formatDuration(3725)).toBe('1 giờ 2 phút');
    expect(formatDuration(undefined)).toBe('–');
  });
  it('formatDate', () => {
    expect(formatDate('2026-10-05')).toBe('05/10/2026');
  });
  it('fillDaily điền ngày trống bằng 0', () => {
    expect(fillDaily([{ date: '2026-10-02', plays: 5 }], '2026-10-01', '2026-10-03')).toEqual([
      { date: '2026-10-01', plays: 0 },
      { date: '2026-10-02', plays: 5 },
      { date: '2026-10-03', plays: 0 },
    ]);
  });
  it('hourlyToLocal đổi UTC sang UTC+7, đủ 24 giờ', () => {
    const h = hourlyToLocal([
      { hour: 0, plays: 3 },
      { hour: 20, plays: 2 },
    ]);
    expect(h).toHaveLength(24);
    expect(h[7].plays).toBe(3);
    expect(h[3].plays).toBe(2);
  });
  it('slugify bỏ dấu tiếng Việt', () => {
    expect(slugify('Trạm xe buýt Đoàn Văn Bơ')).toBe('tram-xe-buyt-doan-van-bo');
  });
});

describe('storage (không có localStorage → bộ nhớ tạm)', () => {
  it('lưu / đọc / xoá token', () => {
    tokenStore.setToken('abc');
    tokenStore.setUser({ id: 1, username: 'admin' });
    expect(tokenStore.getToken()).toBe('abc');
    expect(tokenStore.getUser()).toEqual({ id: 1, username: 'admin' });
    tokenStore.clear();
    expect(tokenStore.getToken()).toBeNull();
    expect(safeStorage.get('missing')).toBeNull();
  });
});

describe('reportSheets', () => {
  it('tạo đủ các sheet Excel', () => {
    const sheets = reportSheets(
      {
        filters: { from: null, to: null, tour_id: null },
        has_data: true,
        summary: { plays: 10, sessions: 4, avg_listen_seconds: 50, total_listen_seconds: 500 },
        by_method: [{ method: 'qr', plays: 10 }],
        by_language: [{ language: 'vi', plays: 10 }],
        per_poi: [{ poi_id: 1, name: 'Bến Nhà Rồng', latitude: 10.7, longitude: 106.7, plays: 10, avg_listen_seconds: 50, sessions: 4 }],
        daily: [{ date: '2026-10-01', plays: 10 }],
        hourly: [{ hour: 1, plays: 10 }],
        heatmap: [],
        routes: [],
      },
      { from: '2026-10-01', to: '2026-10-02', tourName: null },
    );
    expect(sheets.map((s) => s.name)).toEqual(['Tổng quan', 'Theo điểm', 'Theo ngày', 'Theo giờ', 'Cách kích hoạt', 'Ngôn ngữ', 'Bản đồ nhiệt']);
    expect(sheets[1].rows[1]).toContain('Bến Nhà Rồng');
    expect(sheets[2].rows).toHaveLength(3);
    expect(sheets[4].rows[1][0]).toBe('Quét mã QR');
  });
});
