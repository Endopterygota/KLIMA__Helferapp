import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, copyFile, mkdtemp, realpath, rm, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { containedFile } from "./panoply";
import type {
  ToolRequest,
  ToolCheck,
  ConversionRequest,
  ConversionResult,
} from "../src/lib/utility-types";
const exec = promisify(execFile);
async function rootDirectory(directory: string) {
  if (typeof directory !== "string" || !path.isAbsolute(directory) || directory.length > 8192)
    throw new Error("Bitte einen gültigen absoluten Überordner angeben.");
  return realpath(directory);
}
async function toolPath(root: string, executable: string, name: string) {
  if (typeof executable !== "string")
    throw new Error("Bitte das Programm in den Einstellungen auswählen.");
  const file = await containedFile(root, executable, [".exe"]);
  if (path.basename(file).toLowerCase() !== `${name}.exe`)
    throw new Error(`Bitte ${name}.exe auswählen.`);
  return file;
}
export async function checkTool(request: ToolRequest): Promise<ToolCheck> {
  if (!request || !["cdo", "ncdump"].includes(request.tool))
    throw new Error("Unbekanntes Programm.");
  const root = await rootDirectory(request.directory);
  const executable = await toolPath(root, request.executable, request.tool);
  const args = request.tool === "cdo" ? ["-V"] : [];
  const command = request.tool === "cdo" ? "cdo -V" : "ncdump";
  try {
    const { stdout, stderr } = await exec(executable, args, {
      cwd: root,
      windowsHide: true,
      timeout: 20000,
      maxBuffer: 1024 * 1024,
    });
    const output = (stdout + stderr).trim();
    return {
      ok: !!output,
      output: output || "Das Programm hat keine Ausgabe geliefert.",
      command,
      exitCode: 0,
    };
  } catch (cause) {
    const error = cause as Error & {
      code?: string | number;
      stdout?: string;
      stderr?: string;
      killed?: boolean;
    };
    return {
      ok: false,
      output: error.killed
        ? "Die Prüfung wurde nach 20 Sekunden abgebrochen."
        : ((error.stdout ?? "") + (error.stderr ?? "")).trim() || error.message,
      command,
      exitCode: typeof error.code === "number" ? error.code : null,
    };
  }
}
export function validateOutputName(name: string) {
  if (
    typeof name !== "string" ||
    name.length > 240 ||
    !/\.nc$/i.test(name) ||
    // Control characters are intentionally rejected in Windows filenames.
    // eslint-disable-next-line no-control-regex
    /[\\/:*?"<>|\x00-\x1f]/.test(name) ||
    name.startsWith(".") ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(name)
  )
    throw new Error("Bitte einen einfachen Dateinamen mit Endung .nc angeben (ohne Ordnerpfad).");
}
let converting = false;
export async function convertToNetCDF(request: ConversionRequest): Promise<ConversionResult> {
  if (!request) throw new Error("Konvertierungseinstellungen fehlen.");
  validateOutputName(request.output);
  if (converting) throw new Error("Eine Konvertierung läuft bereits.");
  converting = true;
  let temporary: string | undefined;
  try {
    const root = await rootDirectory(request.directory);
    const executable = await toolPath(root, request.cdo, "cdo");
    if (typeof request.input !== "string") throw new Error("Bitte eine GRIB-Datei auswählen.");
    const input = await containedFile(root, request.input, [".grb"]);
    const destination = path.join(root, request.output);
    try {
      await access(destination);
      throw new Error("Die Zieldatei existiert bereits. Bitte einen anderen Namen wählen.");
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
    }
    temporary = await mkdtemp(path.join(root, "kloem-convert-"));
    const output = path.join(temporary, "output.nc");
    const { stdout, stderr } = await exec(
      executable,
      ["-f", "nc", "copy", path.relative(root, input), path.relative(root, output)],
      { cwd: root, windowsHide: true, timeout: 15 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 },
    );
    if (!(await stat(output)).size) throw new Error("CDO hat keine NetCDF-Daten erzeugt.");
    // Publish only a completed result and never replace an existing destination.
    await copyFile(output, destination, constants.COPYFILE_EXCL);
    return {
      output: request.output,
      log: (stdout + stderr).trim() || "CDO hat die Konvertierung erfolgreich abgeschlossen.",
    };
  } catch (cause) {
    const error = cause as Error & { code?: string; stderr?: string; killed?: boolean };
    if (error.code === "EEXIST")
      throw new Error("Die Zieldatei existiert bereits. Bitte einen anderen Namen wählen.");
    if (error.killed) throw new Error("Die Konvertierung wurde nach 15 Minuten abgebrochen.");
    if (error.stderr)
      throw new Error(`CDO-Konvertierung fehlgeschlagen: ${error.stderr.slice(-3000)}`);
    throw cause;
  } finally {
    converting = false;
    if (temporary) await rm(temporary, { recursive: true, force: true }).catch(() => {});
  }
}
