import JSZip from "jszip";

export type PackageInfo = {
  name: string;
  /** posix path of package root inside the VFS (no trailing slash). */
  root: string;
};

export type UrdfEntry = {
  /** posix path inside VFS */
  path: string;
  /** xacro or urdf */
  kind: "xacro" | "urdf";
  /** owning package name, if known */
  pkg?: string;
};

/**
 * In-memory virtual filesystem extracted from an uploaded zip.
 * Paths are posix-style and rooted at the zip's notional root.
 */
export class ZipFS {
  /** path -> raw bytes */
  files = new Map<string, Uint8Array>();
  /** pkgName -> info */
  packages = new Map<string, PackageInfo>();
  urdfs: UrdfEntry[] = [];

  private blobUrls = new Map<string, string>();

  static async fromZip(file: File | Blob): Promise<ZipFS> {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const fs = new ZipFS();

    const stripRoot = detectCommonPrefix(Object.keys(zip.files));

    const entries = Object.values(zip.files).filter((e) => !e.dir);
    await Promise.all(
      entries.map(async (entry) => {
        const path = normalizePath(entry.name.slice(stripRoot.length));
        if (!path) return;
        const bytes = await entry.async("uint8array");
        fs.files.set(path, bytes);
      }),
    );

    fs.discoverPackages();
    fs.discoverUrdfs();
    return fs;
  }

  dispose() {
    for (const url of this.blobUrls.values()) URL.revokeObjectURL(url);
    this.blobUrls.clear();
  }

  /** Read file as UTF-8 text. */
  readText(path: string): string | null {
    const bytes = this.files.get(normalizePath(path));
    if (!bytes) return null;
    return new TextDecoder("utf-8").decode(bytes);
  }

  /** Return a blob URL for the file, caching by path. */
  blobUrl(path: string, mime = "application/octet-stream"): string | null {
    const key = normalizePath(path);
    if (this.blobUrls.has(key)) return this.blobUrls.get(key)!;
    const bytes = this.files.get(key);
    if (!bytes) return null;
    // copy into a fresh ArrayBuffer so the Blob owns a SharedArrayBuffer-safe view
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy.buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    this.blobUrls.set(key, url);
    return url;
  }

  /**
   * Resolve a URDF-style reference (package://, vfs://, file://, absolute,
   * relative to a base) to a concrete path inside the VFS. Returns null if
   * nothing matches.
   */
  resolve(ref: string, basePath?: string): string | null {
    let r = ref.trim();
    // Strip stacked file:// prefixes
    while (r.startsWith("file://")) r = r.slice("file://".length);
    if (r.startsWith("vfs://")) r = "package://" + r.slice("vfs://".length);

    if (r.startsWith("package://")) {
      const rest = r.slice("package://".length);
      const slash = rest.indexOf("/");
      const pkg = slash === -1 ? rest : rest.slice(0, slash);
      const rel = slash === -1 ? "" : rest.slice(slash + 1);
      const info = this.packages.get(pkg);
      if (!info) return this.findByTail(rel);
      const candidate = normalizePath(info.root + "/" + rel);
      if (this.files.has(candidate)) return candidate;
      return this.findByTail(rel);
    }

    // Absolute Windows or POSIX path -> just try tail match
    if (/^[a-zA-Z]:\//.test(r) || r.startsWith("/")) {
      return this.findByTail(r);
    }

    // Relative path -> resolve against basePath
    if (basePath) {
      const baseDir = posixDirname(basePath);
      const joined = normalizePath(baseDir + "/" + r);
      if (this.files.has(joined)) return joined;
    }
    if (this.files.has(normalizePath(r))) return normalizePath(r);
    return this.findByTail(r);
  }

  /** Best-effort: find any file in the VFS that ends with the given tail. */
  private findByTail(tail: string): string | null {
    const t = normalizePath(tail).replace(/^\/+/, "");
    if (!t) return null;
    for (const p of this.files.keys()) {
      if (p === t || p.endsWith("/" + t)) return p;
    }
    // try just the basename
    const base = t.split("/").pop()!;
    for (const p of this.files.keys()) {
      if (p.endsWith("/" + base) || p === base) return p;
    }
    return null;
  }

  private discoverPackages() {
    for (const path of this.files.keys()) {
      if (!path.endsWith("/package.xml") && path !== "package.xml") continue;
      const xml = this.readText(path);
      if (!xml) continue;
      const m = xml.match(/<name>\s*([^<\s]+)\s*<\/name>/);
      if (!m) continue;
      const name = m[1];
      const root = posixDirname(path);
      this.packages.set(name, { name, root });
    }
  }

  private discoverUrdfs() {
    for (const path of this.files.keys()) {
      const lower = path.toLowerCase();
      const isXacro = lower.endsWith(".xacro");
      const isUrdf = lower.endsWith(".urdf");
      if (!isXacro && !isUrdf) continue;
      // skip obvious sub-includes like materials.xacro, *.gazebo
      const base = path.split("/").pop()!.toLowerCase();
      if (
        base.startsWith("materials") ||
        base.includes(".ros2control") ||
        base.includes(".gazebo")
      ) {
        // still keep, but de-prioritize
      }
      const pkg = this.packageOf(path);
      this.urdfs.push({ path, kind: isXacro ? "xacro" : "urdf", pkg });
    }
    this.urdfs.sort((a, b) => {
      const score = (u: UrdfEntry) => {
        const base = u.path.split("/").pop()!.toLowerCase();
        let s = 0;
        if (u.pkg && base.startsWith(u.pkg.toLowerCase())) s -= 10;
        if (base.startsWith("materials")) s += 5;
        if (base.includes(".gazebo") || base.includes(".ros2control")) s += 5;
        if (u.kind === "xacro") s -= 1;
        return s;
      };
      return score(a) - score(b);
    });
  }

  private packageOf(path: string): string | undefined {
    let best: PackageInfo | undefined;
    for (const info of this.packages.values()) {
      const prefix = info.root ? info.root + "/" : "";
      if (path.startsWith(prefix)) {
        if (!best || info.root.length > best.root.length) best = info;
      }
    }
    return best?.name;
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\.\//, "");
}

function posixDirname(p: string): string {
  const idx = p.lastIndexOf("/");
  return idx === -1 ? "" : p.slice(0, idx);
}

/** Detect a common top-level directory shared by all entries, e.g. "pkg/". */
function detectCommonPrefix(names: string[]): string {
  if (names.length === 0) return "";
  const first = names[0];
  const slash = first.indexOf("/");
  if (slash === -1) return "";
  const prefix = first.slice(0, slash + 1);
  for (const n of names) {
    if (!n.startsWith(prefix)) return "";
  }
  // Only strip if there is no package.xml at the actual root
  if (names.includes("package.xml")) return "";
  return prefix;
}
