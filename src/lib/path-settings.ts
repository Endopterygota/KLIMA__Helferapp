export const defaultDirectory = "C:\\Users\\linus\\Documents\\Master\\KLÖM\\KLIMA";
export const fileKinds = [
  { key: "cdo", label: "CDO", hint: "cdo.exe" },
  { key: "ncdump", label: "ncdump", hint: "ncdump.exe" },
  { key: "panoply", label: "Panoply", hint: "Panoply.exe oder Panoply.jar" },
  { key: "grb", label: "GRIB-Datei", hint: ".grb" },
  { key: "nc", label: "NetCDF-Datei", hint: ".nc" },
] as const;
export type FileKind = (typeof fileKinds)[number]["key"];
export type Selection = Record<FileKind, string>;
export type Catalog = Record<FileKind, string[]>;
export const emptySelection = (): Selection => ({
  cdo: "",
  ncdump: "",
  panoply: "",
  grb: "",
  nc: "",
});
export const emptyCatalog = (): Catalog => ({ cdo: [], ncdump: [], panoply: [], grb: [], nc: [] });
export function classifyFile(name: string): FileKind | undefined {
  const lower = name.toLowerCase();
  if (lower === "cdo.exe") return "cdo";
  if (lower === "ncdump.exe") return "ncdump";
  if (lower === "panoply.exe" || lower === "panoply.jar") return "panoply";
  if (lower.endsWith(".grb")) return "grb";
  if (lower.endsWith(".nc")) return "nc";
  return undefined;
}
export function reconcileSelection(catalog: Catalog, previous: Selection): Selection {
  return Object.fromEntries(
    fileKinds.map(({ key }) => [
      key,
      catalog[key].includes(previous[key])
        ? previous[key]
        : catalog[key].length === 1
          ? catalog[key][0]
          : "",
    ]),
  ) as Selection;
}
