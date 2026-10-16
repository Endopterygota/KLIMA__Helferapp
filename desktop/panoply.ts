import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdtemp, readFile, writeFile, realpath, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import type { PlotSource, PlotVariable } from "../src/lib/plot-types";
const exec = promisify(execFile);
export async function containedFile(root: string, relative: string, extensions: string[]) {
  if (!relative || path.isAbsolute(relative))
    throw new Error("Bitte eine Datei aus dem Überordner auswählen.");
  const resolved = await realpath(path.resolve(root, relative));
  const child = path.relative(root, resolved);
  if (
    child.startsWith(".." + path.sep) ||
    child === ".." ||
    path.isAbsolute(child) ||
    !extensions.includes(path.extname(resolved).toLowerCase())
  )
    throw new Error(
      "Die Datei liegt nicht im gewählten Überordner oder hat einen ungültigen Dateityp.",
    );
  return resolved;
}
export async function javaExecutable(root: string) {
  const localJava = path.join(root, "Programme", "Java-11");
  try {
    for (const folder of await readdir(localJava)) {
      const candidate = path.join(localJava, folder, "bin", "java.exe");
      try { await access(candidate); return candidate; } catch { /* optional local runtime */ }
    }
  } catch { /* no Quicksetup runtime */ }
  const candidates = [
    process.env["JAVA_HOME"] ? path.join(process.env["JAVA_HOME"], "bin", "java.exe") : "",
  ];
  for (const vendor of ["Eclipse Adoptium", "Java", "Microsoft"]) {
    const folder = path.join(process.env["ProgramFiles"] ?? "C:\\Program Files", vendor);
    try {
      for (const name of (await readdir(folder)).sort().reverse())
        candidates.push(path.join(folder, name, "bin", "java.exe"));
    } catch {
      /* optional Java vendor */
    }
  }
  for (const candidate of candidates.filter(Boolean)) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      /* try next runtime */
    }
  }
  return "java";
}
let active = false;
export async function runPanoply(
  source: PlotSource,
  helper: string,
  variable?: string,
): Promise<{ variables: PlotVariable[] } | { image: string; variable: string }> {
  if (active) throw new Error("Panoply arbeitet bereits. Bitte den laufenden Auftrag abwarten.");
  if (
    !source ||
    typeof source.directory !== "string" ||
    typeof source.file !== "string" ||
    typeof source.panoply !== "string" ||
    [source.directory, source.file, source.panoply, variable ?? ""].some(
      (text) => text.length > 8192 || text.includes("\0"),
    )
  )
    throw new Error("Ungültige Plot-Einstellungen.");
  if (variable !== undefined && (typeof variable !== "string" || !variable))
    throw new Error("Bitte eine Variable auswählen.");
  active = true;
  let work: string | undefined;
  try {
    if (!path.isAbsolute(source.directory))
      throw new Error("Der Überordner muss ein absoluter Pfad sein.");
    const root = await realpath(source.directory);
    const file = await containedFile(root, source.file, [".nc", ".grb"]);
    const panoply = await containedFile(root, source.panoply, [".exe", ".jar"]);
    if (!/^panoply\.(exe|jar)$/i.test(path.basename(panoply)))
      throw new Error("Bitte Panoply.exe oder Panoply.jar auswählen.");
    const jars =
      path.extname(panoply).toLowerCase() === ".exe"
        ? path.join(path.dirname(panoply), "jars")
        : path.dirname(panoply);
    await access(path.join(jars, "Panoply.jar"));
    work = await mkdtemp(path.join(tmpdir(), "kloem-panoply-"));
    // Electron can read resources inside ASAR; an external JVM cannot. Extract
    // the adapter for each job rather than relying on a portable unpack path.
    let adapter: Buffer;
    try {
      adapter = await readFile(path.join(helper, "ClimatePlot.class"));
    } catch {
      throw new Error(
        "Der Panoply-Helfer fehlt in dieser App-Version. Bitte die neue vollständige EXE verwenden.",
      );
    }
    await writeFile(path.join(work, "ClimatePlot.class"), adapter);
    const output = path.join(work, variable === undefined ? "variables.json" : "plot.png");
    const args = [
      "-Djava.awt.headless=true",
      "-Dfile.encoding=UTF-8",
      "-Xmx1g",
      "-cp",
      `.${path.delimiter}${path.join(jars, "*")}`,
      "ClimatePlot",
      variable === undefined ? "inspect" : "plot",
      file,
      ...(variable === undefined ? [output] : [variable, output]),
    ];
    try {
      await exec(await javaExecutable(root), args, {
        windowsHide: true,
        cwd: work,
        timeout: 120000,
        maxBuffer: 4 * 1024 * 1024,
      });
    } catch (cause) {
      const error = cause as Error & { code?: string; killed?: boolean; stderr?: string };
      if (error.code === "ENOENT")
        throw new Error(
          "Java wurde nicht gefunden. Bitte Java 11 oder neuer installieren oder JAVA_HOME setzen.",
        );
      if (error.killed)
        throw new Error(
          "Panoply wurde nach zwei Minuten abgebrochen. Die Datei ist möglicherweise zu groß.",
        );
      throw new Error(
        `Panoply konnte die Datei oder Variable nicht verarbeiten. ${
          error.stderr
            ?.split("\n")
            .filter((line) => /Exception|Error|Caused by/.test(line))
            .slice(0, 3)
            .join(" ")
            .slice(0, 600) ?? error.message
        }`,
      );
    }
    if (variable === undefined) return JSON.parse(await readFile(output, "utf8"));
    const image = await readFile(output);
    if (image.length > 20 * 1024 * 1024) throw new Error("Die erzeugte Grafik ist zu groß.");
    return { image: `data:image/png;base64,${image.toString("base64")}`, variable };
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error(
        "Eine Datei oder die Panoply-Bibliothek fehlt. Bitte die Pfade in den Einstellungen prüfen.",
      );
    throw cause;
  } finally {
    active = false;
    if (work) await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
