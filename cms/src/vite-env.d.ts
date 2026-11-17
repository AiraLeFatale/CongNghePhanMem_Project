/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Gốc backend khi build production, vd. https://api.example.com (để trống khi dev dùng proxy). */
  readonly VITE_API_URL?: string;
  /** Mẫu URL tile bản đồ (mặc định: CARTO light). */
  readonly VITE_MAP_TILE_URL?: string;
  /** Dòng ghi công bản đồ tương ứng VITE_MAP_TILE_URL. */
  readonly VITE_MAP_TILE_ATTRIBUTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
