import fs from "fs/promises";
import path from "path";

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
]);

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".calltrace",
  "__pycache__",
  ".venv",
  "venv",
]);

export async function discoverCodeFiles(rootPath: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (CODE_EXTENSIONS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  await walk(rootPath);
  return results.sort();
}

export function relativePath(rootPath: string, filePath: string): string {
  return path.relative(rootPath, filePath).split(path.sep).join("/");
}

export function languageForFile(relativeFile: string): "typescript" | "javascript" | "python" | null {
  const ext = path.extname(relativeFile).toLowerCase();
  if ([".ts", ".tsx"].includes(ext)) return "typescript";
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "javascript";
  if (ext === ".py") return "python";
  return null;
}
