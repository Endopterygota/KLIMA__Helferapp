import { access, realpath, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { containedFile, javaExecutable } from "./panoply";
import { scanDirectory } from "../src/local-files-plugin";
import type { WorkspaceHealth } from "../src/lib/workspace-health-types";
const exec = promisify(execFile);
export function javaMajorVersion(output: string) {
  const version = /(?:openjdk|java) version "(?:1\.)?(\d+)/i.exec(output);
  return version ? Number(version[1]) : 0;
}
async function probeJava(root: string) {
  const result = await exec(await javaExecutable(root), ["-version"], { windowsHide: true, timeout: 10000, maxBuffer: 65536 });
  return result.stdout + result.stderr;
}
export async function workspaceHealth(settings: unknown, javaProbe = probeJava): Promise<WorkspaceHealth> {
  const issues: string[] = [];
  const invalid = (message: string): WorkspaceHealth => ({ ok: false, issues: [message] });
  if (!settings || typeof settings !== "object") return invalid("Überordner ist nicht eingestellt und gespeichert.");
  const { directory, selection } = settings as { directory?: unknown; selection?: unknown };
  if (typeof directory !== "string" || !path.isAbsolute(directory) || directory.length > 8192 || directory.includes("\0"))
    return invalid("Überordner ist nicht eingestellt und gespeichert.");
  let root: string;
  try {
    root = await realpath(directory);
    if (!(await stat(root)).isDirectory()) return invalid("Der eingestellte Überordner ist kein Ordner.");
    await access(root, constants.R_OK);
  } catch { return invalid("Der eingestellte Überordner fehlt oder ist nicht lesbar."); }
  const selected = selection && typeof selection === "object" ? selection as Record<string, unknown> : {};
  for (const [key, label] of [["cdo", "CDO"], ["ncdump", "ncdump"], ["panoply", "Panoply"]] as const) {
    const relative = selected[key];
    if (typeof relative !== "string" || !relative) { issues.push(`${label} ist nicht ausgewählt und gespeichert.`); continue; }
    try {
      const file = await containedFile(root, relative, key === "panoply" ? [".exe", ".jar"] : [".exe"]);
      if (!(await stat(file)).isFile() || !new RegExp(`^${key}\\.(exe${key === "panoply" ? "|jar" : ""})$`, "i").test(path.basename(file))) throw new Error();
      await access(file, constants.R_OK);
      if (key === "panoply") {
        const jars = path.extname(file).toLowerCase() === ".jar" ? path.dirname(file) : path.join(path.dirname(file), "jars");
        if (!(await stat(path.join(jars, "Panoply.jar"))).isFile()) throw new Error();
        await access(path.join(jars, "Panoply.jar"), constants.R_OK);
      }
    } catch { issues.push(`${label} fehlt, ist nicht lesbar oder unvollständig. Bitte die Pfadauswahl prüfen.`); }
  }
  try {
    if (javaMajorVersion(await javaProbe(root)) < 11) issues.push("Java 11 oder neuer fehlt.");
  } catch { issues.push("Java 11 oder neuer wurde nicht gefunden oder konnte nicht gestartet werden."); }
  try {
    const catalog = await scanDirectory(root);
    if (!catalog.files.grb.length && !catalog.files.nc.length) issues.push("Keine GRIB- oder NetCDF-Datei im Überordner gefunden.");
    if (catalog.warnings.length) issues.push("Einige Unterordner sind nicht lesbar.");
  } catch { issues.push("Die Klimadateien im Überordner konnten nicht geprüft werden."); }
  return { ok: !issues.length, issues };
}
