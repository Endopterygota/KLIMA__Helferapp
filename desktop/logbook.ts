import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, realpath, stat, rename, rm, copyFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { containedFile } from "./panoply";
import type { LogSnapshot, LogSaveResult } from "../src/lib/logbook-types";
async function logPath(directory: string) {
  if (typeof directory !== "string" || !path.isAbsolute(directory))
    throw new Error("Bitte den Überordner in den Einstellungen prüfen.");
  const root = await realpath(directory);
  const pending = [root];
  const matches: string[] = [];
  let visited = 0;
  while (pending.length) {
    if (++visited > 10000) throw new Error("Zu viele Unterordner. Bitte einen kleineren Überordner wählen.");
    const current = pending.shift()!;
    const entries = await readdir(current, { withFileTypes: true });
    const local = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase() === "logbuch.txt");
    if (current === root && local.length === 1)
      return containedFile(root, local[0]!.name, [".txt"]);
    matches.push(...local.map((entry) => path.relative(root, path.join(current, entry.name))));
    if (matches.length > 1)
      throw new Error("Mehrere logbuch.txt gefunden. Bitte den Ordner des gewünschten Logbuchs in den Einstellungen wählen.");
    pending.push(...entries.filter((entry) => entry.isDirectory() && !entry.isSymbolicLink()).map((entry) => path.join(current, entry.name)));
  }
  if (!matches.length) throw new Error("Keine logbuch.txt im gewählten Überordner oder seinen Unterordnern gefunden.");
  return containedFile(root, matches[0]!, [".txt"]);
}
function decode(buffer: Buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.subarray(2).toString("utf16le");
  if (buffer[0] === 0xfe && buffer[1] === 0xff)
    return Buffer.from(buffer.subarray(2)).swap16().toString("utf16le");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}
export async function readLogbook(directory: string): Promise<LogSnapshot> {
  const file = await logPath(directory);
  if ((await stat(file)).size > 2 * 1024 * 1024)
    throw new Error("Das Logbuch ist zu groß (maximal 2 MB).");
  const buffer = await readFile(file);
  return {
    text: decode(buffer).replace(/\r\n/g, "\n"),
    version: createHash("sha256").update(file).update("\0").update(buffer).digest("hex"),
    modified: (await stat(file)).mtime.toISOString(),
    path: file,
  };
}
const saving = new Set<string>();
export async function saveLogbook(
  directory: string,
  text: string,
  expected: string,
): Promise<LogSaveResult> {
  if (
    typeof text !== "string" ||
    Buffer.byteLength(text, "utf8") > 2 * 1024 * 1024 ||
    typeof expected !== "string"
  )
    throw new Error("Ungültiger Logbuchinhalt.");
  const file = await logPath(directory);
  if (saving.has(file)) throw new Error("Das Logbuch wird bereits gespeichert.");
  saving.add(file);
  const temporary = path.join(path.dirname(file), `.logbuch-${randomUUID()}.tmp`);
  try {
    let current = await readLogbook(directory);
    if (current.version !== expected) return { saved: false, snapshot: current };
    try {
      await copyFile(file, `${file}.bak`, constants.COPYFILE_EXCL);
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "EEXIST") throw cause;
    }
    await writeFile(temporary, "\uFEFF" + text.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"), {
      encoding: "utf8",
      flag: "wx",
    });
    current = await readLogbook(directory);
    if (current.version !== expected) return { saved: false, snapshot: current };
    await rename(temporary, file);
    return { saved: true, snapshot: await readLogbook(directory) };
  } finally {
    saving.delete(file);
    await rm(temporary, { force: true }).catch(() => {});
  }
}
