import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { scanDirectory } from "./local-files-plugin";
it("finds nested files, ignores unrelated extensions and prefers the Panoply launcher", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "clima-paths-"));
  try {
    await mkdir(path.join(root, "Panoply", "jars"), { recursive: true });
    await mkdir(path.join(root, ".quicksetup", "downloads"), { recursive: true });
    await writeFile(path.join(root, ".quicksetup", "downloads", "cached.nc"), "");
    for (const file of [
      "cdo.exe",
      "ncdump.exe",
      "a.grb",
      "b.NC",
      "ignored.nc.txt",
      "Panoply/Panoply.exe",
      "Panoply/jars/Panoply.jar",
    ])
      await writeFile(path.join(root, file), "");
    const result = await scanDirectory(root);
    expect(result.files.nc).toEqual(["b.NC"]);
    expect(result.files.grb).toEqual(["a.grb"]);
    expect(result.files.cdo).toEqual(["cdo.exe"]);
    expect(result.files.ncdump).toEqual(["ncdump.exe"]);
    expect(result.files.panoply).toEqual([path.join("Panoply", "Panoply.exe")]);
    await expect(scanDirectory("relative")).rejects.toThrow("absoluten");
    await expect(scanDirectory(path.join(root, "missing"))).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
