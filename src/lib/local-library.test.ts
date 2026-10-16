import { expect, it } from "vitest";
import { emptyCatalog } from "./path-settings";
import { sortedLibrary } from "./local-library";
it("lists every climate file, sorts naturally and distinguishes duplicate names by subfolder", () => {
  const files = {
    ...emptyCatalog(),
    grb: ["z/data10.grb", "a/data2.grb"],
    nc: ["b/data2.nc", "a/data2.nc"],
  };
  expect(sortedLibrary(files).map((file) => file.relativePath)).toEqual([
    "a/data2.grb",
    "a/data2.nc",
    "b/data2.nc",
    "z/data10.grb",
  ]);
  expect(sortedLibrary(files, "b/", "nc").map((file) => file.relativePath)).toEqual(["b/data2.nc"]);
  expect(sortedLibrary(files, "", "grb", true).map((file) => file.name)).toEqual([
    "data10.grb",
    "data2.grb",
  ]);
});
