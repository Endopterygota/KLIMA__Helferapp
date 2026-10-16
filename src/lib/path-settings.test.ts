import { describe, expect, it } from "vitest";
import { classifyFile, emptyCatalog, emptySelection, reconcileSelection } from "./path-settings";
describe("file selection", () => {
  it("filters extensions and executable names case insensitively", () => {
    expect(classifyFile("DATA.NC")).toBe("nc");
    expect(classifyFile("data.grb")).toBe("grb");
    expect(classifyFile("CDO.EXE")).toBe("cdo");
    expect(classifyFile("Panoply.exe")).toBe("panoply");
    expect(classifyFile("other.exe")).toBeUndefined();
    expect(classifyFile("data.nc.xlsx")).toBeUndefined();
  });
  it("selects single matches, preserves valid choices and clears missing choices", () => {
    const files = { ...emptyCatalog(), cdo: ["cdo.exe"], nc: ["a.nc", "b.nc"] };
    expect(reconcileSelection(files, { ...emptySelection(), nc: "b.nc", grb: "gone.grb" })).toEqual(
      { ...emptySelection(), cdo: "cdo.exe", nc: "b.nc" },
    );
    expect(reconcileSelection(files, emptySelection()).nc).toBe("");
  });
});
