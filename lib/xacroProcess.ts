import { XacroParser } from "xacro-parser";
import type { ZipFS } from "./zipFs";

/**
 * Run xacro-parser on a file inside the VFS and return the resulting URDF XML
 * string. For plain .urdf inputs, returns the file contents unchanged (after
 * normalising mesh URL prefixes).
 */
export async function processXacro(
  vfs: ZipFS,
  entryPath: string,
): Promise<string> {
  const raw = vfs.readText(entryPath);
  if (raw === null) throw new Error(`Entry file not found: ${entryPath}`);

  const isXacro = entryPath.toLowerCase().endsWith(".xacro");

  const cleaned = normalizeRefs(raw);
  if (!isXacro) return cleaned;

  const parser = new XacroParser();
  parser.workingPath = "/" + posixDirname(entryPath);
  parser.rospackCommands = {
    find: (pkg: string) => `package://${pkg}`,
  };
  parser.requirePrefix = false;
  parser.getFileContents = async (filePath: string) => {
    const resolved = resolveInclude(vfs, filePath, entryPath);
    if (!resolved) {
      throw new Error(`xacro include not found: ${filePath}`);
    }
    const txt = vfs.readText(resolved);
    if (txt === null) throw new Error(`xacro include unreadable: ${filePath}`);
    return normalizeRefs(txt);
  };

  const doc: Document = await parser.parse(cleaned);
  return new XMLSerializer().serializeToString(doc);
}

function resolveInclude(
  vfs: ZipFS,
  filePath: string,
  entryPath: string,
): string | null {
  // xacro-parser may pass absolute-looking paths like "/urdf/x.xacro" or
  // already-resolved "package://pkg/urdf/x.xacro" forms.
  let p = filePath.replace(/^file:\/\//, "");
  if (p.startsWith("package://")) return vfs.resolve(p, entryPath);
  // Strip leading slash that we injected via workingPath
  if (p.startsWith("/")) p = p.slice(1);
  return vfs.resolve(p, entryPath);
}

/**
 * Strip stacked `file://` prefixes that appear before `$(find ...)` or
 * `package://` in many auto-generated URDF/xacro files.
 */
function normalizeRefs(text: string): string {
  return text
    .replace(/file:\/\/(\$\(find )/g, "$1")
    .replace(/file:\/\/(package:\/\/)/g, "$1");
}

function posixDirname(p: string): string {
  const idx = p.lastIndexOf("/");
  return idx === -1 ? "" : p.slice(0, idx);
}
