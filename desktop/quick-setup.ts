import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readdir, readFile, writeFile, rm, access, copyFile, lstat, realpath, cp } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { downloadSetupFile, type SetupDownload } from "./setup-download";
import { scanDirectory } from "../src/local-files-plugin";
import { emptySelection } from "../src/lib/path-settings";
import type { SetupState, SetupRequest } from "../src/lib/quick-setup-types";
const exec = promisify(execFile);
export const setupDownloads = {
  bootstrap: { name: "7zr.exe", url: "https://github.com/ip7z/7zip/releases/download/26.04/7zr.exe", sha256: "256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282" },
  unpacker: { name: "7z2604-x64.exe", url: "https://github.com/ip7z/7zip/releases/download/26.04/7z2604-x64.exe", sha256: "d54bf805f9f3704d1e8db2fa3498ae7ef2df0312b40b558e7c71c734430a665d" },
  java: { name: "Temurin11-jre.zip", url: "https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.32.1%2B1/OpenJDK11U-jre_x64_windows_hotspot_11.0.32.1_1.zip", sha256: "f8c7da672f5dba36b6f870608820b6b598cfae91296929f1b8f21ef2f1e8a0dd" },
  panoply: { name: "PanoplyWin-5.10.2.zip", url: "https://www.giss.nasa.gov/tools/panoply/download/PanoplyWin-5.10.2.zip", sha256: "1c508c99d503b80e5b179bfdd30259fd802da78dec7b7fc43799b265c1b7a8fe" },
  cdo: { name: "cdo-1.6.4-win32.zip", url: "https://code.mpimet.mpg.de/attachments/download/8378/cdo-1.6.4-win32.zip", sha256: "ccd66b020de355e50dfc76997b55195a2a82ac4787350be0b9c573413d278621" },
  ncdump: { name: "netCDF4.10.1-NC4-64.exe", url: "https://downloads.unidata.ucar.edu/netcdf-c/4.10.1/netCDF4.10.1-NC4-64.exe", sha256: "e30d214774dabdedffcf5310267885b237d9bdaf7bb631f52932d85d8b04a102" },
  example: { name: "sresa1b_ncar_ccsm3-example.nc", url: "https://archive.unidata.ucar.edu/software/netcdf/examples/sresa1b_ncar_ccsm3-example.nc", sha256: "2c2047ee329654f3bebf0a4b0d99eada50f1183728a3c7c129b0bc50d404511b", maxBytes: 10 * 1024 * 1024 },
  manual: { name: "CDO-Handbuch.pdf", url: "https://code.mpimet.mpg.de/projects/cdo/embedded/cdo.pdf", maxBytes: 30 * 1024 * 1024 },
} satisfies Record<string, SetupDownload>;
export async function safeSetupFolder(root: string, name: string) {
  const target = path.join(root, name);
  try { if ((await lstat(target)).isSymbolicLink()) throw new Error("Setup-Ordner darf keine Verknüpfung sein."); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  await mkdir(target, { recursive: true });
  return realpath(target);
}
async function findFile(root: string, name: string): Promise<string> {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) return path.join(root, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      const found = await findFile(path.join(root, entry.name), name);
      if (found) return found;
    }
  }
  return "";
}
export class QuickSetup {
  state: SetupState = { running: false, directory: "", message: "Bereit", completed: [], warnings: [] };
  private controller?: AbortController;
  constructor(private publish: (state: SetupState) => void, private fetcher: typeof fetch = fetch) {}
  private update(change: Partial<SetupState>) {
    this.state = { ...this.state, ...change };
    this.publish(this.state);
  }
  cancel() { this.controller?.abort(new Error("Quicksetup wurde abgebrochen. Downloads bleiben zur Wiederaufnahme erhalten.")); }
  start(request: SetupRequest) {
    if (this.state.running) throw new Error("Ein Quicksetup läuft bereits.");
    if (!request || typeof request.directory !== "string" || !path.isAbsolute(request.directory) || request.directory.length > 8192 || request.directory.includes("\0"))
      throw new Error("Bitte einen gültigen absoluten Zielordner wählen.");
    if (process.platform !== "win32" || process.arch !== "x64") throw new Error("Quicksetup unterstützt derzeit Windows x64.");
    this.controller = new AbortController();
    this.update({ running: true, directory: request.directory, message: "Arbeitsordner anlegen …", completed: [], warnings: [], error: undefined, result: undefined, received: undefined, total: undefined });
    void this.run(request, this.controller.signal).catch((error) => this.update({ error: error.message, message: "Setup unterbrochen" })).finally(() => this.update({ running: false }));
    return this.state;
  }
  private async run(request: SetupRequest, signal: AbortSignal) {
    await mkdir(request.directory, { recursive: true });
    const root = await realpath(request.directory);
    const managed = await safeSetupFolder(root, ".quicksetup");
    const cache = await safeSetupFolder(managed, "downloads");
    const tools = await safeSetupFolder(root, "Programme");
    const data = await safeSetupFolder(root, "Daten");
    const docs = await safeSetupFolder(root, "Dokumentation");
    const done = (name: string) => this.update({ completed: [...this.state.completed, name], received: undefined, total: undefined });
    const download = async (item: SetupDownload) => {
      this.update({ message: `${item.name} herunterladen …`, received: 0, total: undefined });
      return downloadSetupFile(item, path.join(cache, item.name), signal, (received, total) => this.update({ received, total }), this.fetcher);
    };
    const unpack = async (executable: string, archive: string, name: string, destination = tools) => {
      signal.throwIfAborted();
      const target = path.join(destination, name);
      try {
        if ((await lstat(target)).isSymbolicLink()) throw new Error("Setup-Ziel ist eine Verknüpfung.");
        const installed = await readFile(path.join(target, ".kloem-package"), "utf8").catch(() => "");
        if (installed === path.basename(archive)) return target;
        const unfinished = await readFile(path.join(target, ".kloem-installing"), "utf8").catch(() => "");
        if (unfinished !== path.basename(archive)) throw new Error(`Der Ordner ${name} existiert bereits und gehört nicht zu diesem Setup.`);
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      const temporary = await mkdtemp(path.join(managed, "entpacken-"));
      try {
        this.update({ message: `${name} lokal einrichten …`, received: undefined, total: undefined });
        await exec(executable, ["x", archive, `-o${temporary}`, "-y"], { windowsHide: true, timeout: 300000, signal, maxBuffer: 4 * 1024 * 1024 });
        // Copy instead of renaming a populated directory: Windows may keep
        // extracted subdirectories open. Only marked, app-owned partial installs
        // can be repaired; unrelated existing directories are never overwritten.
        signal.throwIfAborted();
        await mkdir(target, { recursive: true });
        await writeFile(path.join(target, ".kloem-installing"), path.basename(archive));
        await cp(temporary, target, { recursive: true, force: true });
        await writeFile(path.join(target, ".kloem-package"), path.basename(archive), { flag: "wx" });
        await rm(path.join(target, ".kloem-installing"));
      } finally { await rm(temporary, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }); }
      return target;
    };
    const bootstrap = await download(setupDownloads.bootstrap);
    const unpackerFolder = await unpack(bootstrap, await download(setupDownloads.unpacker), "7zip-26.04", managed);
    const sevenZip = path.join(unpackerFolder, "7z.exe");
    done("Entpacker");
    for (const [label, item, folder] of [
      ["Java 11", setupDownloads.java, "Java-11"],
      ["Panoply", setupDownloads.panoply, "Panoply-5.10.2"],
      ["CDO 1.6.4 (Kursversion)", setupDownloads.cdo, "CDO-1.6.4"],
      ["ncdump", setupDownloads.ncdump, "NetCDF-4.10.1"],
    ] as const) {
      signal.throwIfAborted();
      try { await unpack(sevenZip, await download(item), folder); done(label); }
      catch (error) {
        signal.throwIfAborted();
        this.update({ warnings: [...this.state.warnings, `${label}: ${(error as Error).message}`] });
      }
    }
    for (const [label, item, destination] of [["NetCDF-Beispieldatei", setupDownloads.example, data], ["CDO-Handbuch", setupDownloads.manual, docs]] as const) {
      try {
        signal.throwIfAborted();
        const downloaded = await download(item);
        const magic = (await readFile(downloaded)).subarray(0, 4).toString("ascii");
        if (!(item.name.endsWith(".nc") ? magic.startsWith("CDF") : magic === "%PDF")) throw new Error("Download hat nicht das erwartete Dateiformat.");
        await copyFile(downloaded, path.join(destination, item.name), constants.COPYFILE_EXCL).catch((error) => { if (error.code !== "EEXIST") throw error; });
        done(label);
      } catch (error) { signal.throwIfAborted(); this.update({ warnings: [...this.state.warnings, `${label}: ${(error as Error).message}`] }); }
    }
    if (request.sourceDirectory && path.resolve(request.sourceDirectory) !== root) {
      try {
        this.update({ message: "Vorhandene Kursdateien übernehmen …" });
        const source = await realpath(request.sourceDirectory);
        const catalog = await scanDirectory(source);
        const candidates = [...catalog.files.grb, ...catalog.files.nc];
        for (const relative of candidates) {
          signal.throwIfAborted();
          const sourceFile = await realpath(path.join(source, relative));
          const inside = path.relative(source, sourceFile);
          if (inside.startsWith("..") || path.isAbsolute(inside)) continue;
          const target = path.join(data, path.basename(relative));
          await copyFile(sourceFile, target, constants.COPYFILE_EXCL).catch((error) => { if (error.code !== "EEXIST") throw error; });
        }
        const excel = await findFile(source, "EH5_OM_20C3M_1_YM_TEMP2_Test.txt");
        if (excel) await copyFile(excel, path.join(data, path.basename(excel)), constants.COPYFILE_EXCL).catch((error) => { if (error.code !== "EEXIST") throw error; });
        if (candidates.length || excel) done("Vorhandene Kursdateien übernommen");
      } catch (error) { signal.throwIfAborted(); this.update({ warnings: [...this.state.warnings, `Kursdateien: ${(error as Error).message}`] }); }
    }
    await writeFile(path.join(root, "logbuch.txt"), "\uFEFFKLÖM | Logbuch\r\n==============\r\n\r\nArbeitsverzeichnis\r\n------------------\r\n" + root + "\r\n", { flag: "wx" }).catch((error) => { if (error.code !== "EEXIST") throw error; });
    await writeFile(path.join(docs, "Kursdateien.txt"), "Das öffentliche NetCDF-Beispiel von Unidata ersetzt nicht die Kursdateien.\r\nEH5_OM_20C3M_1_YM_TEMP2_Test.txt: aus dem Kurs-Intranet beziehen.\r\nECHAM5/IPCC_AR4: https://www.wdc-climate.de/ui/ (eigenes Konto, Datensatz und Zeitraum wie in der Vorbereitung wählen).\r\nCDO 1.6.4 ist die ältere Windows-Kursversion aus der PDF.\r\n", { flag: "wx" }).catch((error) => { if (error.code !== "EEXIST") throw error; });
    const catalog = await scanDirectory(root);
    const selection = emptySelection();
    for (const key of ["cdo", "ncdump", "panoply", "nc", "grb"] as const) {
      selection[key] = catalog.files[key].find((file) => key !== "panoply" || file.toLowerCase().endsWith("panoply.exe")) ?? catalog.files[key][0] ?? "";
    }
    this.update({ message: "Programme und Beispieldaten prüfen …", received: undefined, total: undefined });
    for (const key of ["cdo", "ncdump"] as const) {
      try {
        const args = key === "cdo" ? ["-V"] : ["-h", path.join(data, setupDownloads.example.name)];
        if (!selection[key]) throw new Error("Programm fehlt.");
        await exec(path.join(root, selection[key]), args, { windowsHide: true, signal, timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
        done(`${key} geprüft`);
      } catch (error) { signal.throwIfAborted(); this.update({ warnings: [...this.state.warnings, `${key}-Prüfung: ${(error as Error).message.slice(0, 300)}`] }); }
    }
    const java = await findFile(path.join(tools, "Java-11"), "java.exe").catch(() => "");
    try {
      if (!java) throw new Error("Java fehlt.");
      await exec(java, ["-version"], { windowsHide: true, signal, timeout: 30000 });
      done("Java geprüft");
    } catch (error) { signal.throwIfAborted(); this.update({ warnings: [...this.state.warnings, `Java-Prüfung: ${(error as Error).message.slice(0, 300)}`] }); }
    if (selection.cdo && selection.nc) {
      const grib = path.join(data, "CCSM3-Temperatur-Beispiel.grb");
      let temporary: string | undefined;
      try {
        try { await access(grib); }
        catch {
          temporary = await mkdtemp(path.join(managed, "grib-"));
          const output = path.join(temporary, "beispiel.grb");
          this.update({ message: "GRIB-Testdatei aus öffentlichem NetCDF-Beispiel erzeugen …" });
          await exec(path.join(root, selection.cdo), ["-f", "grb", "selname,tas", path.join(data, setupDownloads.example.name), output], { windowsHide: true, signal, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
          await copyFile(output, grib, constants.COPYFILE_EXCL);
        }
        if (!selection.grb) selection.grb = path.relative(root, grib);
        done("GRIB-Temperaturbeispiel erzeugt");
      } catch (error) { signal.throwIfAborted(); this.update({ warnings: [...this.state.warnings, `GRIB-Beispiel: ${(error as Error).message.slice(0, 300)}`] }); }
      finally { if (temporary) await rm(temporary, { recursive: true, force: true }); }
    }
    signal.throwIfAborted();
    this.update({ directory: root, result: { directory: root, selection }, message: this.state.warnings.length ? "Setup beendet – bitte Hinweise prüfen." : "Quicksetup abgeschlossen." });
  }
}
