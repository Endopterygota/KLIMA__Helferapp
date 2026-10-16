import { defaultDirectory, type Catalog } from "./path-settings";
export const settingsStorageKey = "clima.path-settings.v1";
export function libraryDirectory(): string {
  const saved = JSON.parse(localStorage.getItem(settingsStorageKey) ?? "null");
  return typeof saved?.directory === "string" && saved.directory.trim()
    ? saved.directory
    : defaultDirectory;
}
export async function scanLocalFiles(
  directory: string,
): Promise<{ directory: string; files: Catalog; warnings: string[] }> {
  if (window.climaDesktop) return window.climaDesktop.scanDirectory(directory);
  const response = await fetch("/api/local-files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ directory }),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("Die Ordnersuche benötigt die lokal gestartete App (pnpm dev).");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Der Ordner konnte nicht gelesen werden.");
  return data;
}
export function sortedLibrary(files: Catalog, query = "", type = "all", descending = false) {
  const collator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });
  return (["grb", "nc"] as const)
    .flatMap((kind) =>
      files[kind].map((relativePath) => ({
        kind,
        relativePath,
        name: relativePath.split(/[\\/]/).at(-1) ?? relativePath,
        folder: relativePath.split(/[\\/]/).slice(0, -1).join(" / ") || "Überordner",
      })),
    )
    .filter(
      (file) =>
        (type === "all" || file.kind === type) &&
        file.relativePath.toLocaleLowerCase("de").includes(query.toLocaleLowerCase("de")),
    )
    .sort(
      (a, b) =>
        (collator.compare(a.name, b.name) || collator.compare(a.relativePath, b.relativePath)) *
        (descending ? -1 : 1),
    );
}
