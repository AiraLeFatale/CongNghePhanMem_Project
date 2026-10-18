import { describe, expect, it, vi } from 'vitest';
import { ApiError, buildQuery, createApiClient, normalizeBase, qrContent } from './api';

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  it('ghép base URL và gửi Bearer token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { items: [] }));
    const api = createApiClient({ baseUrl: 'https://api.example.com/', fetchImpl, getToken: () => 'tok' });
    await api.listPois('bến');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/admin/pois?q=b%E1%BA%BFn');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.method).toBe('GET');
  });

  it('gửi JSON cho POST và trả dữ liệu', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { id: 9, name: 'Tour' }));
    const api = createApiClient({ fetchImpl, getToken: () => 't' });
    const res = await api.createTour({ name: 'Tour', description: null, poi_ids: [2, 1] });
    expect(res).toEqual({ id: 9, name: 'Tour' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/admin/tours');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ name: 'Tour', description: null, poi_ids: [2, 1] });
  });

  it('không đặt Content-Type cho multipart (FormData)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { url: '/uploads/a.png' }));
    const api = createApiClient({ fetchImpl, getToken: () => 't' });
    await api.uploadImage(new File(['x'], 'a.png', { type: 'image/png' }));
    const init = fetchImpl.mock.calls[0][1];
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('204 trả null', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const api = createApiClient({ fetchImpl, getToken: () => 't' });
    await expect(api.deletePoi(3)).resolves.toBeNull();
    expect(fetchImpl.mock.calls[0][1].method).toBe('DELETE');
  });

  it('lỗi 400 thành ApiError kèm details từng trường', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(400, { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details: { radius_m: 'Bán kính kích hoạt phải lớn hơn 0' } } }),
    );
    const api = createApiClient({ fetchImpl, getToken: () => 't' });
    const err = await api.createPoi({} as never).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Dữ liệu không hợp lệ');
    expect(err.details).toEqual({ radius_m: 'Bán kính kích hoạt phải lớn hơn 0' });
  });

  it('401 ở API quản trị gọi onUnauthorized', async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Hết phiên' } }));
    const api = createApiClient({ fetchImpl, getToken: () => 'old', onUnauthorized });
    await expect(api.me()).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('401 khi đăng nhập sai KHÔNG gọi onUnauthorized và không gửi token', async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Sai mật khẩu' } }));
    const api = createApiClient({ fetchImpl, getToken: () => 'old', onUnauthorized });
    await expect(api.login('admin', 'x')).rejects.toMatchObject({ message: 'Sai mật khẩu' });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('lỗi mạng thành NETWORK_ERROR tiếng Việt', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const api = createApiClient({ fetchImpl });
    await expect(api.listTours()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('phản hồi lỗi không phải JSON vẫn có thông báo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    const api = createApiClient({ fetchImpl });
    await expect(api.listTours()).rejects.toMatchObject({ status: 502, message: 'Máy chủ trả lỗi 502' });
  });

  it('analytics bỏ tham số rỗng', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const api = createApiClient({ fetchImpl });
    await api.analytics({ from: '2026-10-01', to: '2026-10-18', tour_id: null });
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/admin/analytics?from=2026-10-01&to=2026-10-18');
  });

  it('fileUrl thêm origin backend cho đường dẫn /uploads', () => {
    expect(createApiClient({ baseUrl: 'http://h:4000' }).fileUrl('/uploads/a.mp3')).toBe('http://h:4000/uploads/a.mp3');
    expect(createApiClient({}).fileUrl('/uploads/a.mp3')).toBe('/uploads/a.mp3');
    expect(createApiClient({ baseUrl: 'http://h' }).fileUrl('https://cdn/x.mp3')).toBe('https://cdn/x.mp3');
    expect(createApiClient({}).fileUrl(null)).toBeNull();
  });
});

describe('helpers', () => {
  it('normalizeBase, buildQuery, qrContent', () => {
    expect(normalizeBase(' http://a.com/// ')).toBe('http://a.com');
    expect(normalizeBase(undefined)).toBe('');
    expect(buildQuery({ a: 1, b: '', c: null, d: undefined })).toBe('?a=1');
    expect(buildQuery({})).toBe('');
    expect(qrContent({ payload: 'abc', content: undefined })).toBe('NARR:abc');
    expect(qrContent({ payload: 'abc', content: 'NARR:abc' })).toBe('NARR:abc');
  });
});
