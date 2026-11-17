/**
 * Chuỗi VietQR (chuẩn EMVCo của NAPAS) để app ngân hàng nào cũng quét được,
 * kèm sẵn số tiền và nội dung chuyển khoản.
 */
function tlv(id: string, value: string) {
  return id + String(value.length).padStart(2, '0') + value;
}

/** CRC-16/CCITT-FALSE theo yêu cầu của EMVCo. */
export function crc16(s: string) {
  let crc = 0xffff;
  for (const ch of new TextEncoder().encode(s)) {
    crc ^= ch << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function vietQrPayload({ bin, account, amount, note }: { bin: string; account: string; amount: number; note: string }) {
  const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', account)) + tlv('02', 'QRIBFTTA');
  const body =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('38', merchant) +
    tlv('53', '704') +
    tlv('54', String(Math.round(amount))) +
    tlv('58', 'VN') +
    tlv('62', tlv('08', note)) +
    '6304';
  return body + crc16(body);
}

/** Mã ngắn của ngân hàng nhận theo BIN, dùng trong deeplink dl.vietqr.io. */
const BANK_CODE: Record<string, string> = { '970436': 'vcb', '970422': 'mb', '970407': 'tcb', '970418': 'bidv', '970415': 'icb', '970416': 'acb' };

/** App ngân hàng phổ biến; autofill=false nghĩa là app mở ra nhưng không tự điền, cần quét ảnh QR. */
export const BANK_APPS = [
  { id: 'mb', name: 'MB Bank', autofill: true },
  { id: 'vcb', name: 'Vietcombank', autofill: false },
  { id: 'tcb', name: 'Techcombank', autofill: true },
  { id: 'bidv', name: 'BIDV', autofill: true },
  { id: 'icb', name: 'VietinBank', autofill: true },
  { id: 'acb', name: 'ACB', autofill: true },
  { id: 'vpb', name: 'VPBank', autofill: true },
  { id: 'tpb', name: 'TPBank', autofill: true },
  { id: 'vba', name: 'Agribank', autofill: true },
  { id: 'cake', name: 'Cake', autofill: true },
];

export function bankDeeplink(app: string, { bin, account, amount, note }: { bin: string; account: string; amount: number; note: string }) {
  const p = new URLSearchParams({ app, ba: `${account}@${BANK_CODE[bin] ?? bin}`, am: String(Math.round(amount)), tn: note });
  return `https://dl.vietqr.io/pay?${p}`;
}
