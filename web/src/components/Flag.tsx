import type { LanguageCode } from '../lib/types';

/** Cờ vẽ bằng SVG (không dùng emoji vì Windows không hiện cờ emoji). Tỉ lệ 3:2, bo góc bằng CSS. */
export function Flag({ code, className }: { code: LanguageCode; className?: string }) {
  const cls = `flag${className ? ` ${className}` : ''}`;
  switch (code) {
    case 'vi':
      return (
        <svg className={cls} viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <rect width="30" height="20" fill="#da251d" />
          <polygon fill="#ffcd00" points="15,4.2 16.35,8.35 20.7,8.35 17.18,10.9 18.52,15.05 15,12.5 11.48,15.05 12.82,10.9 9.3,8.35 13.65,8.35" />
        </svg>
      );
    case 'en':
      return (
        <svg className={cls} viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <g>
            <rect width="60" height="40" fill="#012169" />
            <path d="M0,0 60,40 M60,0 0,40" stroke="#fff" strokeWidth="8" />
            <path d="M0,0 60,40 M60,0 0,40" stroke="#c8102e" strokeWidth="3" />
            <path d="M30,0 v40 M0,20 h60" stroke="#fff" strokeWidth="12" />
            <path d="M30,0 v40 M0,20 h60" stroke="#c8102e" strokeWidth="7" />
          </g>
        </svg>
      );
    case 'zh':
      return (
        <svg className={cls} viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <rect width="30" height="20" fill="#de2910" />
          <polygon fill="#ffde00" points="5,2 5.9,4.75 8.8,4.75 6.45,6.45 7.35,9.2 5,7.5 2.65,9.2 3.55,6.45 1.2,4.75 4.1,4.75" />
          {[
            [10, 2],
            [12, 4],
            [12, 7],
            [10, 9],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.85" fill="#ffde00" />
          ))}
        </svg>
      );
    case 'ko':
      return (
        <svg className={cls} viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <rect width="30" height="20" fill="#fff" />
          <g transform="translate(15 10) rotate(33.7)">
            <path d="M-5,0 a5,5 0 0 1 10,0 a2.5,2.5 0 0 1 -5,0 a2.5,2.5 0 0 0 -5,0" fill="#cd2e3a" />
            <path d="M-5,0 a5,5 0 0 0 10,0 a2.5,2.5 0 0 0 -5,0 a2.5,2.5 0 0 1 -5,0" fill="#0047a0" />
          </g>
          <g stroke="#000" strokeWidth="0.9">
            <path d="M4.2,4.6 l2.6,-1.7 M4.8,5.5 l2.6,-1.7 M5.4,6.4 l2.6,-1.7" />
            <path d="M22,2.9 l2.6,1.7 M22.6,2 l2.6,1.7 M21.4,3.8 l2.6,1.7" />
            <path d="M4.2,15.4 l2.6,1.7 M4.8,14.5 l2.6,1.7 M5.4,13.6 l2.6,1.7" />
            <path d="M22,17.1 l2.6,-1.7 M22.6,18 l2.6,-1.7 M21.4,16.2 l2.6,-1.7" />
          </g>
        </svg>
      );
    case 'ja':
      return (
        <svg className={cls} viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <rect width="30" height="20" fill="#fff" />
          <circle cx="15" cy="10" r="6" fill="#bc002d" />
        </svg>
      );
    case 'fr':
      return (
        <svg className={cls} viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <rect width="10" height="20" fill="#002395" />
          <rect x="10" width="10" height="20" fill="#fff" />
          <rect x="20" width="10" height="20" fill="#ed2939" />
        </svg>
      );
    default:
      return null;
  }
}
