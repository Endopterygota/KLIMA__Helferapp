import { cp, mkdir, mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();
// Package the fully bundled app separately so frontend development dependencies
// are not collected into the executable by the package manager's workspace scan.
const staging = await mkdtemp(path.join(tmpdir(), "kloem-package-"));
await cp("desktop-dist", staging, { recursive: true });
// electron-builder's built-in traversal collector avoids invoking a package
// manager for this already bundled application with no runtime dependencies.
const metadata = JSON.parse(await readFile(path.join(staging, 'package.json'), 'utf8'));
metadata.packageManager = 'traversal@1.0.0';
await writeFile(path.join(staging, 'package.json'), JSON.stringify(metadata, null, 2));
await mkdir(path.join(staging, "node_modules"), { recursive: true });
await writeFile(
  path.join(staging, "package-lock.json"),
  JSON.stringify({
    name: "kloem-helferapp",
    version: "0.2.0",
    lockfileVersion: 3,
    packages: { "": { name: "kloem-helferapp", version: "0.2.0" } },
  }),
);
const electronVersion = require("electron/package.json").version;
const electronDist = path.dirname(require("electron"));
const result = spawnSync(
  process.execPath,
  [
    require.resolve("electron-builder/cli.js"),
    "--projectDir",
    staging,
    "--config",
    path.join(projectRoot, "electron-builder.yml"),
    "--config.directories.app=.",
    `--config.directories.output=${path.join(projectRoot, "release")}`,
    `--config.electronVersion=${electronVersion}`,
    `--config.electronDist=${electronDist}`,
    "--win",
    "portable",
    "--x64",
  ],
  { stdio: "inherit", env: { ...process.env, ELECTRON_BUILDER_COMPRESSION_LEVEL: process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL ?? '1' } },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
