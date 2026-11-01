/**
 * Tác vụ vị trí nền — PHẢI được định nghĩa ở phạm vi module, nạp trước expo-router (xem index.js).
 * Chỉ chạy trong development build / bản build độc lập; Expo Go không hỗ trợ (app tự hạ cấp về GPS tiền cảnh).
 */
import type { LocationObject } from 'expo-location';

/** Tên tác vụ nền, phải khớp giữa nơi đăng ký và nơi bật/tắt trong location/index.ts. */
export const BACKGROUND_LOCATION_TASK = 'narration-background-location';

type FixHandler = (loc: LocationObject) => void;
// Callback do pipeline đăng ký và bộ đệm các bản ghi đến trước khi pipeline sẵn sàng.
let handler: FixHandler | null = null;
const pending: LocationObject[] = [];

/** Pipeline đăng ký khi đã sẵn sàng; bản ghi đến sớm được giữ lại (tối đa 20). */
export function setBackgroundFixHandler(h: FixHandler | null): void {
  handler = h;
  if (h) while (pending.length) h(pending.shift()!);
}

type TaskManagerModule = typeof import('expo-task-manager');
let taskManager: TaskManagerModule | null = null;
try {
  // require trong try: nếu môi trường thiếu native module thì app vẫn chạy (chỉ mất vị trí nền).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  taskManager = require('expo-task-manager') as TaskManagerModule;
} catch {
  taskManager = null;
}

/** null nếu TaskManager không có trong môi trường hiện tại. */
export function getTaskManager(): TaskManagerModule | null {
  return taskManager;
}

try {
  const TaskManager = taskManager!;
  if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
    // Tác vụ do OS gọi khi app ở nền: chuyển từng vị trí cho handler hoặc xếp đệm.
    TaskManager.defineTask<{ locations?: LocationObject[] }>(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error || !data?.locations) return;
      for (const loc of data.locations) {
        if (handler) handler(loc);
        else {
          // Pipeline chưa sẵn sàng → giữ tối đa 20 bản ghi gần nhất.
          pending.push(loc);
          if (pending.length > 20) pending.shift();
        }
      }
    });
  }
} catch {
  // TaskManager không có (ví dụ Expo Go trên Android) → chỉ dùng vị trí tiền cảnh.
}
