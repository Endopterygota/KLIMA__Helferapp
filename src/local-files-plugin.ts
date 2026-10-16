import { readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { classifyFile, emptyCatalog } from "./lib/path-settings";

export async function scanDirectory(directory: string) {
  if (!path.isAbsolute(directory)) throw new Error("Bitte einen absoluten Ordnerpfad angeben.");
  const root = await realpath(directory);
  if (!(await stat(root)).isDirectory()) throw new Error("Der Pfad ist kein Ordner.");
  const files = emptyCatalog();
  const warnings: string[] = [];
  let visited = 0;
  async function walk(folder: string) {
    if (++visited > 10000)
      throw new Error("Der Ordner ist zu groß. Bitte einen kleineren Überordner wählen.");
    const entries = await readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(folder, entry.name);
      // Do not follow links or junctions outside the chosen directory.
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        try {
          await walk(absolute);
        } catch (error) {
          if (
            (error as NodeJS.ErrnoException).code === "EACCES" ||
            (error as NodeJS.ErrnoException).code === "EPERM"
          )
            warnings.push(path.relative(root, absolute));
          else throw error;
        }
      } else if (entry.isFile()) {
        const kind = classifyFile(entry.name);
        if (kind) files[kind].push(path.relative(root, absolute));
      }
    }
  }
  await walk(root);
  // Prefer the native launcher over its bundled Java archive.
  if (files.panoply.some((file) => file.toLowerCase().endsWith(".exe")))
    files.panoply = files.panoply.filter((file) => file.toLowerCase().endsWith(".exe"));
  Object.values(files).forEach((list) => list.sort((a, b) => a.localeCompare(b, "de")));
  return { directory: root, files, warnings };
}

async function middleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (req.url?.split("?")[0] !== "/api/local-files") return next();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  const send = (status: number, data: object) => {
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };
  const remote = req.socket.remoteAddress;
  const hostname = req.headers.host?.split(":")[0];
  if (
    !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote ?? "") ||
    !["localhost", "127.0.0.1", "["].includes(hostname ?? "")
  )
    return send(403, { error: "Die Ordnersuche ist nur auf diesem Computer verfügbar." });
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)
    return send(403, { error: "Ungültiger Ursprung der Anfrage." });
  if (req.method !== "POST" || req.headers["content-type"] !== "application/json")
    return send(405, { error: "JSON-POST erforderlich." });
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 8192) return send(413, { error: "Der Pfad ist zu lang." });
    }
    const input = JSON.parse(body);
    if (typeof input.directory !== "string" || !input.directory.trim())
      return send(400, { error: "Bitte einen Ordnerpfad angeben." });
    send(200, await scanDirectory(input.directory.trim()));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    send(400, {
      error:
        code === "ENOENT"
          ? "Der Ordner wurde nicht gefunden."
          : code === "EACCES" || code === "EPERM"
            ? "Für diesen Ordner fehlen Leserechte."
            : error instanceof Error
              ? error.message
              : "Der Ordner konnte nicht gelesen werden.",
    });
  }
}
export function localFilesPlugin(): Plugin {
  return {
    name: "local-climate-files",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
