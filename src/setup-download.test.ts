import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { downloadSetupFile } from "../desktop/setup-download";
import { QuickSetup, safeSetupFolder } from "../desktop/quick-setup";
const content = "verified package";
const item = { name: "package.zip", url: "https://example.org/package.zip", sha256: createHash("sha256").update(content).digest("hex") };
it("resumes a partial download and reuses a verified complete cache", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "setup-download-"));
  try {
    const target = path.join(root, item.name);
    await writeFile(`${target}.part`, content.slice(0, 4));
    const fetcher = vi.fn().mockResolvedValue(new Response(content.slice(4), { status: 206, headers: { "Content-Range": `bytes 4-${content.length - 1}/${content.length}`, "Content-Length": String(content.length - 4) } }));
    await downloadSetupFile(item, target, new AbortController().signal, vi.fn(), fetcher);
    expect(fetcher.mock.calls[0]?.[1]?.headers).toEqual(expect.objectContaining({ Range: "bytes=4-" }));
    expect(await readFile(target, "utf8")).toBe(content);
    await downloadSetupFile(item, target, new AbortController().signal, vi.fn(), fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
it("restarts when a server ignores Range and never promotes a corrupt payload", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "setup-corrupt-"));
  try {
    const target = path.join(root, item.name);
    await writeFile(`${target}.part`, "old");
    const good = vi.fn().mockImplementation(async () => new Response(content));
    await downloadSetupFile(item, target, new AbortController().signal, vi.fn(), good);
    expect(await readFile(target, "utf8")).toBe(content);
    await rm(target);
    const bad = vi.fn().mockImplementation(async () => new Response("bad"));
    await expect(downloadSetupFile(item, target, new AbortController().signal, vi.fn(), bad)).rejects.toThrow("SHA-256");
    await expect(readFile(target)).rejects.toThrow();
  } finally { await rm(root, { recursive: true, force: true }); }
});
it("rejects insecure downloads, aborts and invalid setup paths", async () => {
  await expect(downloadSetupFile({ ...item, url: "http://example.org/a" }, "unused", new AbortController().signal, vi.fn())).rejects.toThrow("HTTPS");
  const abort = new AbortController(); abort.abort();
  await expect(downloadSetupFile(item, "unused", abort.signal, vi.fn())).rejects.toThrow();
  expect(() => new QuickSetup(vi.fn()).start({ directory: "relative" })).toThrow("Zielordner");
  const root = await mkdtemp(path.join(tmpdir(), "setup-directory-"));
  try { expect(await safeSetupFolder(root, "Programme")).toBe(path.join(root, "Programme")); }
  finally { await rm(root, { recursive: true, force: true }); }
});
