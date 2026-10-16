import { mkdtemp, copyFile, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { expect, it, vi } from "vitest";
import { checkTool, convertToNetCDF, validateOutputName } from "../desktop/utility";
it("rejects output paths, non-NetCDF names and Windows device names", () => {
  for (const name of ["../data.nc", "C:\\data.nc", "data.grb", "NUL.nc", ".nc"])
    expect(() => validateOutputName(name)).toThrow();
  expect(() => validateOutputName("temperatur-neu.nc")).not.toThrow();
});
it("never overwrites an existing output file", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "kloem-no-overwrite-"));
  try {
    await writeFile(path.join(folder, "cdo.exe"), "not executed");
    await writeFile(path.join(folder, "input.grb"), "input");
    await writeFile(path.join(folder, "output.nc"), "keep me");
    await expect(
      convertToNetCDF({
        directory: folder,
        cdo: "cdo.exe",
        input: "input.grb",
        output: "output.nc",
      }),
    ).rejects.toThrow("existiert bereits");
    expect(await readFile(path.join(folder, "output.nc"), "utf8")).toBe("keep me");
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
it("rejects executable requests for other programs", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "kloem-tool-"));
  try {
    await writeFile(path.join(folder, "other.exe"), "");
    await expect(
      checkTool({ directory: folder, executable: "other.exe", tool: "cdo" }),
    ).rejects.toThrow("cdo.exe");
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
