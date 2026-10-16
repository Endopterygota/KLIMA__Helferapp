import { mkdtemp, writeFile, rm, realpath } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { containedFile } from "../desktop/panoply";
it("accepts climate files inside the root and rejects traversal or executable data inputs", async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), "clima-check-"));
  const root = await realpath(temporary);
  try {
    await writeFile(path.join(root, "data.nc"), "");
    await writeFile(path.join(root, "bad.exe"), "");
    expect(await containedFile(root, "data.nc", [".nc", ".grb"])).toBe(path.join(root, "data.nc"));
    await expect(containedFile(root, path.join(root, "data.nc"), [".nc"])).rejects.toThrow();
    await expect(containedFile(root, "bad.exe", [".nc"])).rejects.toThrow();
    await expect(containedFile(root, "../outside.nc", [".nc"])).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
