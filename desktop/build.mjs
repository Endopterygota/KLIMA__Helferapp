import { build } from "esbuild";
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
const panoplyJars = process.env.KLOEM_PANOPLY_JARS;
if (!panoplyJars) throw new Error("Bitte KLOEM_PANOPLY_JARS auf den jars-Ordner der Panoply-Installation setzen.");
await mkdir("desktop-dist/java", { recursive: true });
const compiler = spawnSync(
  "javac",
  [
    "--release",
    "11",
    "-encoding",
    "UTF-8",
    "-cp",
    path.join(panoplyJars, "*"),
    "-d",
    "desktop-dist/java",
    "desktop/java/ClimatePlot.java",
  ],
  { stdio: "inherit", windowsHide: true },
);
if (compiler.error) throw compiler.error;
if (compiler.status !== 0)
  throw new Error("Der Panoply-Adapter konnte nicht kompiliert werden. KLOEM_PANOPLY_JARS prüfen.");
await mkdir("desktop-dist", { recursive: true });
await build({
  entryPoints: ["desktop/main.ts"],
  outfile: "desktop-dist/main.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
});
await copyFile("desktop/preload.cjs", "desktop-dist/preload.cjs");
await writeFile(
  "desktop-dist/package.json",
  JSON.stringify(
    {
      name: "kloem-helferapp",
      productName: "KLÖM Helferapp",
      version: "0.2.0",
      description: "Lokaler Arbeitsbereich für Klimadateien",
      author: "KLÖM",
      main: "main.cjs",
    },
    null,
    2,
  ),
);
