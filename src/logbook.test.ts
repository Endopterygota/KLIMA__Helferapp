import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { readLogbook, saveLogbook } from "../desktop/logbook";
it("discovers nested logbooks, prefers the root and rejects ambiguous matches", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "kloem-discovery-"));
  try {
    await expect(readLogbook(folder)).rejects.toThrow("Keine logbuch.txt");
    await mkdir(path.join(folder, "Unterordner"));
    const nested = path.join(folder, "Unterordner", "LOGBUCH.TXT");
    await writeFile(nested, "Unterordner");
    const initial = await readLogbook(folder);
    expect(initial.path).toBe(nested);
    expect((await saveLogbook(folder, "Gespeichert", initial.version)).saved).toBe(true);
    await mkdir(path.join(folder, "Weiterer"));
    await writeFile(path.join(folder, "Weiterer", "logbuch.txt"), "Zweites");
    await expect(readLogbook(folder)).rejects.toThrow("Mehrere logbuch.txt");
    await writeFile(path.join(folder, "logbuch.txt"), "Gespeichert");
    expect((await readLogbook(folder)).path).toBe(path.join(folder, "logbuch.txt"));
    expect((await saveLogbook(folder, "Veralteter Entwurf", initial.version)).saved).toBe(false);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
it("writes the real file, preserves an original backup and refuses stale saves", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "kloem-log-"));
  try {
    await writeFile(path.join(folder, "logbuch.txt"), "Original\r\nZeile 2");
    const initial = await readLogbook(folder);
    const result = await saveLogbook(folder, "Überarbeitet\nZeile 2", initial.version);
    expect(result.saved).toBe(true);
    expect((await readLogbook(folder)).text).toBe("Überarbeitet\nZeile 2");
    expect(await readFile(path.join(folder, "logbuch.txt.bak"), "utf8")).toBe(
      "Original\r\nZeile 2",
    );
    await writeFile(path.join(folder, "logbuch.txt"), "Extern geändert");
    const conflict = await saveLogbook(folder, "Veralteter Entwurf", result.snapshot.version);
    expect(conflict.saved).toBe(false);
    expect(conflict.snapshot.text).toBe("Extern geändert");
    expect(await readFile(path.join(folder, "logbuch.txt"), "utf8")).toBe("Extern geändert");
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
it("reads Windows UTF-16 text without corrupting umlauts", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "kloem-log-encoding-"));
  try {
    await writeFile(
      path.join(folder, "logbuch.txt"),
      Buffer.from("\ufeffKLÖM\r\nTemperatur", "utf16le"),
    );
    expect((await readLogbook(folder)).text).toBe("KLÖM\nTemperatur");
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
