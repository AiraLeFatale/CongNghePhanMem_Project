import QRCode from 'qrcode';

export const QR_INSTRUCTION = 'Quét mã để nghe thuyết minh';

export function qrDataUrl(content: string, size = 320): Promise<string> {
  return QRCode.toDataURL(content, { width: size, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b1f1d', light: '#ffffff' } });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không tạo được ảnh mã QR'));
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** Ảnh PNG để in: mã QR lớn + nhãn trạm + tên điểm + hướng dẫn. */
export async function qrPosterBlob(content: string, label: string | null, poiName: string | null): Promise<Blob> {
  const W = 1000;
  const qrSize = 820;
  const img = await loadImage(await qrDataUrl(content, qrSize));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas');
  const font = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.font = `700 46px ${font}`;
  const titleLines = wrap(ctx, label || poiName || 'Điểm thuyết minh', W - 120);
  ctx.font = `400 34px ${font}`;
  const subLines = label && poiName ? wrap(ctx, poiName, W - 120) : [];
  const H = 90 + qrSize + 40 + titleLines.length * 58 + subLines.length * 44 + 110;
  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(0, 0, W, 16);
  ctx.drawImage(img, (W - qrSize) / 2, 70, qrSize, qrSize);
  ctx.textAlign = 'center';
  let y = 70 + qrSize + 70;
  ctx.fillStyle = '#0b1f1d';
  ctx.font = `700 46px ${font}`;
  for (const l of titleLines) {
    ctx.fillText(l, W / 2, y);
    y += 58;
  }
  ctx.fillStyle = '#41524f';
  ctx.font = `400 34px ${font}`;
  for (const l of subLines) {
    ctx.fillText(l, W / 2, y);
    y += 44;
  }
  ctx.fillStyle = '#0f766e';
  ctx.font = `600 36px ${font}`;
  ctx.fillText(QR_INSTRUCTION, W / 2, y + 30);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không xuất được PNG'))), 'image/png'));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Tên file an toàn: bỏ dấu tiếng Việt, ký tự đặc biệt. */
export function slugify(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'ma-qr'
  );
}

export async function downloadQrPng(content: string, label: string | null, poiName: string | null) {
  const blob = await qrPosterBlob(content, label, poiName);
  downloadBlob(blob, `qr-${slugify(label || poiName || content)}.png`);
}
