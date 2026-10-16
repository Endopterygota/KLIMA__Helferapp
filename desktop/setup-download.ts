import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, rename, rm, stat, lstat } from "node:fs/promises";
export type SetupDownload = { url: string; name: string; sha256?: string; maxBytes?: number };
export async function fileHash(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
/** Only complete, verified files are promoted from .part to the final cache. */
export async function downloadSetupFile(
  item: SetupDownload,
  target: string,
  signal: AbortSignal,
  progress: (received: number, total?: number) => void,
  fetcher: typeof fetch = fetch,
) {
  if (new URL(item.url).protocol !== "https:") throw new Error("Downloads benötigen HTTPS.");
  const limit = item.maxBytes ?? 200 * 1024 * 1024;
  try {
    if (!(await lstat(target)).isFile()) throw new Error("Ungültige Cache-Datei.");
    const size = (await stat(target)).size;
    if (size > 0 && size <= limit && (!item.sha256 || await fileHash(target) === item.sha256)) return target;
    await rm(target);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
  }
  const partial = `${target}.part`;
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    try {
      const offset = await lstat(partial).then((s) => {
        if (!s.isFile()) throw new Error("Ungültige unvollständige Download-Datei.");
        return s.size;
      }).catch((error) => { if (error.code === "ENOENT") return 0; throw error; });
      const timeout = AbortSignal.timeout(2 * 60 * 60 * 1000);
      const response = await fetcher(item.url, {
        signal: AbortSignal.any([signal, timeout]),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; KLOEM-Helferapp/0.2.0)", Accept: "*/*", ...(offset ? { Range: `bytes=${offset}-` } : {}) },
      });
      if (response.url && new URL(response.url).protocol !== "https:")
        throw new Error("Unsichere Download-Weiterleitung.");
      if (!response.ok || !response.body) {
        if (response.status === 416) await rm(partial, { force: true });
        throw new Error(`Download fehlgeschlagen (HTTP ${response.status}).`);
      }
      const resume = offset > 0 && response.status === 206;
      if (response.status === 206 && !response.headers.get("content-range")?.startsWith(`bytes ${offset}-`))
        throw new Error("Ungültige Fortsetzung des Downloads.");
      let received = resume ? offset : 0;
      const length = Number(response.headers.get("content-length"));
      const total = length > 0 ? received + length : undefined;
      if (total && total > limit) throw new Error("Download überschreitet die erlaubte Größe.");
      const handle = await open(partial, resume ? "a" : "w");
      const reader = response.body.getReader();
      let lastUpdate = 0;
      try {
        while (true) {
          signal.throwIfAborted();
          const { done, value } = await reader.read();
          if (done) break;
          received += value.length;
          if (received > limit) throw new Error("Download überschreitet die erlaubte Größe.");
          await handle.writeFile(value);
          if (Date.now() - lastUpdate > 1000) { progress(received, total); lastUpdate = Date.now(); }
        }
      } finally {
        await reader.cancel().catch(() => {});
        await handle.close();
      }
      if (!received || (total && received !== total)) throw new Error("Download ist unvollständig.");
      if (item.sha256 && await fileHash(partial) !== item.sha256) {
        await rm(partial, { force: true });
        throw new Error("Die SHA-256-Prüfsumme des Downloads stimmt nicht überein.");
      }
      await rename(partial, target);
      progress(received, received);
      return target;
    } catch (cause) { last = cause; }
  }
  signal.throwIfAborted();
  throw last;
}
