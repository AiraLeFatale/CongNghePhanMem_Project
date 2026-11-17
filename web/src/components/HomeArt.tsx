/** Hình minh hoạ nét mảnh cho trang chủ và chân trang: cầu dây văng, nhà cao tầng, lá cây, điện thoại quét mã. */

export function SkylineArt({ className, tone = '#2f7a55' }: { className?: string; tone?: string }) {
  const cables = [];
  // 2 trụ cầu dây văng, mỗi trụ toả 7 dây mỗi bên
  for (const px of [190, 410]) {
    for (let i = 1; i <= 7; i++) {
      cables.push(<line key={`${px}l${i}`} x1={px} y1={38 + i * 3} x2={px - i * 26} y2={128} />);
      cables.push(<line key={`${px}r${i}`} x1={px} y1={38 + i * 3} x2={px + i * 26} y2={128} />);
    }
  }
  const towers = [
    [470, 70, 26], [500, 52, 30], [534, 84, 24], [562, 40, 34], [600, 76, 28], [632, 60, 22], [658, 92, 30],
  ];
  return (
    <svg className={className} viewBox="0 0 700 150" fill="none" aria-hidden="true" focusable="false">
      <g stroke={tone} strokeWidth="1.4" strokeLinecap="round" opacity="0.9">
        {towers.map(([x, y, w]) => (
          <g key={x}>
            <rect x={x} y={y} width={w} height={150 - y} fill="#ffffff" fillOpacity="0.55" />
            {Array.from({ length: Math.floor((140 - y) / 14) }, (_, r) => (
              <line key={r} x1={x + 5} x2={x + w - 5} y1={y + 12 + r * 14} y2={y + 12 + r * 14} strokeOpacity="0.45" />
            ))}
          </g>
        ))}
      </g>
      <g stroke={tone} strokeWidth="1.2" strokeLinecap="round" opacity="0.75">
        {cables}
      </g>
      <g stroke={tone} strokeWidth="3" strokeLinecap="round">
        <path d="M190 30 L184 132 M190 30 L196 132" />
        <path d="M410 30 L404 132 M410 30 L416 132" />
        <path d="M0 128 Q 300 118 700 128" strokeWidth="3.2" />
      </g>
      <path d="M0 140 Q 350 128 700 142" stroke={tone} strokeOpacity="0.35" strokeWidth="1.2" />
    </svg>
  );
}

export function LeavesArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 260" aria-hidden="true" focusable="false">
      <path d="M40 260 C 60 190, 70 140, 120 70" stroke="#3f7d3a" strokeWidth="3" fill="none" />
      <path d="M118 74 C 70 70, 40 40, 46 4 C 86 14, 116 40, 118 74 Z" fill="#6aa84f" />
      <path d="M100 120 C 150 104, 190 120, 214 150 C 170 168, 124 156, 100 120 Z" fill="#4e9a45" />
      <path d="M78 160 C 34 140, 8 104, 10 70 C 50 84, 76 118, 78 160 Z" fill="#82bb5a" />
      <path d="M66 210 C 108 196, 150 206, 176 232 C 130 250, 86 240, 66 210 Z" fill="#3f8a3c" />
      <path d="M118 74 C 98 54, 70 30, 46 4 M100 120 C 140 128, 180 138, 214 150 M78 160 C 56 130, 30 100, 10 70 M66 210 C 110 218, 150 226, 176 232" stroke="#2f6b2f" strokeOpacity="0.45" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

export function PhoneArt({ className }: { className?: string }) {
  const qr = [
    [0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2],
    [4, 0], [5, 1], [4, 2], [6, 2], [5, 3], [3, 4], [4, 4], [6, 4], [3, 5], [5, 5], [4, 6], [6, 6],
    [0, 4], [1, 4], [2, 4], [0, 5], [2, 5], [0, 6], [1, 6], [2, 6],
  ];
  return (
    <svg className={className} viewBox="0 0 150 190" aria-hidden="true" focusable="false">
      <path d="M14 150 C -4 120, 4 82, 30 70 C 34 100, 30 128, 14 150 Z" fill="#6aa84f" />
      <path d="M24 176 C 8 160, 10 136, 28 124 C 36 144, 36 162, 24 176 Z" fill="#4e9a45" />
      <g transform="rotate(-10 80 95)">
        <rect x="40" y="12" width="86" height="164" rx="16" fill="#1d2b27" />
        <rect x="45" y="18" width="76" height="152" rx="12" fill="#ffffff" />
        <rect x="70" y="22" width="26" height="5" rx="2.5" fill="#1d2b27" />
        <g transform="translate(55 46)">
          <rect x="-4" y="-4" width="64" height="64" rx="6" fill="#eef6ef" />
          {qr.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x * 8} y={y * 8} width="7.4" height="7.4" rx="1" fill="#14211e" />
          ))}
        </g>
        <g stroke="#2f9a6a" strokeWidth="3" strokeLinecap="round">
          {[6, 14, 22, 10, 26, 16, 8, 20, 12, 6].map((h, i) => (
            <line key={i} x1={58 + i * 5.5} x2={58 + i * 5.5} y1={140 - h / 2} y2={140 + h / 2} />
          ))}
        </g>
      </g>
      <path d="M118 30 q 10 10 0 20 M126 24 q 16 16 0 32" stroke="#2f9a6a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Đường sóng phía trên chân trang. */
export function FooterWave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 40 C 240 0, 480 0, 720 28 C 960 56, 1200 60, 1440 18 L1440 70 L0 70 Z" fill="currentColor" />
    </svg>
  );
}
