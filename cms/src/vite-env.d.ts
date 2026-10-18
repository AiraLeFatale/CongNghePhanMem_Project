/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Gốc backend khi build production, vd. https://api.example.com (để trống khi dev dùng proxy). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
