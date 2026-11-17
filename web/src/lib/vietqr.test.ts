import { describe, expect, it } from 'vitest';
import { crc16, vietQrPayload } from './vietqr';

describe('VietQR', () => {
  it('CRC-16/CCITT-FALSE đúng giá trị chuẩn', () => {
    expect(crc16('123456789')).toBe('29B1');
  });
  it('dựng chuỗi có đủ BIN, số tài khoản, số tiền, nội dung và CRC hợp lệ', () => {
    const s = vietQrPayload({ bin: '970436', account: '1019518779', amount: 5000, note: 'TMABC234' });
    expect(s).toContain('0006970436');
    expect(s).toContain('01101019518779');
    expect(s).toContain('54045000');
    expect(s).toContain('0808TMABC234');
    expect(crc16(s.slice(0, -4))).toBe(s.slice(-4));
  });
});
