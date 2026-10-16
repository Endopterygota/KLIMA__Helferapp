import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { workspaceHealth, javaMajorVersion } from "../desktop/workspace-health";
import { emptySelection } from "./lib/path-settings";
const java = async () => 'openjdk version "11.0.32"';
it("requires saved settings and validates folder, tools, Panoply libraries, Java and climate data", async () => {
  expect((await workspaceHealth(null, java)).ok).toBe(false);
  const directory = await mkdtemp(path.join(tmpdir(), "clima-health-"));
  try {
    const selection = { ...emptySelection(), cdo: "cdo.exe", ncdump: "ncdump.exe", panoply: "Panoply.exe" };
    await mkdir(path.join(directory, "jars"));
    for (const name of ["cdo.exe", "ncdump.exe", "Panoply.exe", "jars/Panoply.jar", "example.nc"]) await writeFile(path.join(directory, name), "test");
    expect(await workspaceHealth({ directory, selection }, java)).toEqual({ ok: true, issues: [] });
    expect((await workspaceHealth({ directory, selection }, async () => 'java version "1.8.0"')).issues).toContain("Java 11 oder neuer fehlt.");
    await rm(path.join(directory, "jars/Panoply.jar"));
    await rm(path.join(directory, "example.nc"));
    const missing = await workspaceHealth({ directory, selection }, java);
    expect(missing.ok).toBe(false);
    expect(missing.issues.some((issue) => issue.startsWith("Panoply fehlt"))).toBe(true);
    expect(missing.issues).toContain("Keine GRIB- oder NetCDF-Datei im Überordner gefunden.");
    expect((await workspaceHealth({ directory, selection: {} }, java)).issues.some((issue) => issue.startsWith("CDO ist nicht ausgewählt"))).toBe(true);
    expect((await workspaceHealth({ directory: path.join(directory, "missing") }, java)).ok).toBe(false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
it("recognises Java 8, 11 and modern versions", () => {
  expect(javaMajorVersion('java version "1.8.0_412"')).toBe(8);
  expect(javaMajorVersion('openjdk version "11.0.32" 2026')).toBe(11);
  expect(javaMajorVersion('openjdk version "21.0.7"')).toBe(21);
  expect(javaMajorVersion("not java")).toBe(0);
});
