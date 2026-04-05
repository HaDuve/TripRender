/**
 * Tauri-only export: Photos library on iOS (no custom album), system save on Android.
 * Bundled to dist/tauri-bridge.js by build.js.
 */
import { mkdir, writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { join, appCacheDir } from "@tauri-apps/api/path";
import { platform } from "@tauri-apps/plugin-os";
import { invoke, isTauri } from "@tauri-apps/api/core";

const CACHE_REL = "route-animation.mp4";
/** Must match `identifier` in `src-tauri/tauri.conf.json` — segment under $CACHE for app cache dir. */
const IOS_APP_CACHE_SEGMENT = "com.triprender.routefinder";

/**
 * @param {ArrayBuffer | Uint8Array} mp4
 * @returns {Promise<{ kind: string, path?: string }>}
 */
export async function saveTripRenderExport(mp4) {
  const bytes = mp4 instanceof Uint8Array ? mp4 : new Uint8Array(mp4);
  const os = platform();

  if (os === "ios") {
    // Ensure app cache dir exists (iOS may not create Library/Caches until mkdir runs).
    await mkdir(IOS_APP_CACHE_SEGMENT, {
      baseDir: BaseDirectory.Cache,
      recursive: true,
    });
    await writeFile(CACHE_REL, bytes, { baseDir: BaseDirectory.AppCache });
    const cacheRoot = await appCacheDir();
    const fullPath = await join(cacheRoot, CACHE_REL);
    await invoke("save_video_to_photos_library", { path: fullPath });
    return { kind: "ios-photos-library", path: fullPath };
  }

  if (os === "android") {
    const target = await save({
      defaultPath: "route-animation.mp4",
      filters: [{ name: "Video", extensions: ["mp4"] }],
    });
    if (target === null) {
      return { kind: "cancelled" };
    }
    await writeFile(target, bytes);
    return { kind: "android-save", path: target };
  }

  return { kind: "desktop-fallback" };
}

export function triprenderIsTauri() {
  return isTauri();
}

if (typeof window !== "undefined") {
  window.saveTripRenderExport = saveTripRenderExport;
  window.triprenderIsTauri = triprenderIsTauri;
}
