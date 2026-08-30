import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { discoverCodeFiles, languageForFile, relativePath } from "../extract/discovery";
import { extractFile } from "../extract/engine";
import { resolveCrossFileCalls } from "../extract/symbol-resolution";
import { mergeExtractions } from "../graph/build";
import { validateExtraction } from "../graph/validate";
import type { CallTraceGraph } from "../graph/types";

const execFileAsync = promisify(execFile);

export interface AnalyzeOptions {
  source: string;
  workDir?: string;
}

export interface AnalyzeResult {
  graph: CallTraceGraph;
  rootPath: string;
  warnings: string[];
}

function isGitHubUrl(input: string): boolean {
  return /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?(\/.*)?$/.test(input);
}

function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  const repo = match[2]!.replace(/\.git$/, "");
  return { owner: match[1]!, repo };
}

async function cloneRepository(url: string, targetDir: string): Promise<string> {
  await fs.mkdir(targetDir, { recursive: true });
  await execFileAsync("git", ["clone", "--depth", "1", url, targetDir]);
  return targetDir;
}

async function resolveRootPath(source: string, workDir: string): Promise<string> {
  if (isGitHubUrl(source)) {
    const { owner, repo } = parseGitHubUrl(source);
    const cloneDir = path.join(workDir, `${owner}-${repo}`);
    return cloneRepository(source.replace(/\/tree\/[^/]+.*$/, ".git"), cloneDir);
  }

  const resolved = path.resolve(source);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) {
    throw new Error("Source path must be a directory");
  }
  return resolved;
}

export async function analyzeRepository(options: AnalyzeOptions): Promise<AnalyzeResult> {
  const workDir = options.workDir ?? path.join(os.tmpdir(), "calltrace-work");
  const rootPath = await resolveRootPath(options.source, workDir);
  const files = await discoverCodeFiles(rootPath);
  const warnings: string[] = [];

  const extractions = files
    .map((absolutePath) => {
      const rel = relativePath(rootPath, absolutePath);
      const language = languageForFile(rel);
      if (!language) return null;
      try {
        return extractFile(absolutePath, rel, language);
      } catch (error) {
        warnings.push(`Failed to parse ${rel}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const resolvedEdges = resolveCrossFileCalls(extractions);
  const fragments = extractions.map((extraction) => ({
    nodes: extraction.nodes,
    edges: extraction.edges,
  }));
  if (resolvedEdges.length > 0) {
    fragments.push({ nodes: [], edges: resolvedEdges });
  }

  const combined = {
    nodes: fragments.flatMap((fragment) => fragment.nodes),
    edges: fragments.flatMap((fragment) => fragment.edges),
  };

  const issues = validateExtraction(combined);
  if (issues.length > 0) {
    warnings.push(`${issues.length} validation issue(s) detected during merge`);
  }

  const graph = mergeExtractions(fragments, {
    root: rootPath,
    fileCount: files.length,
  });

  return { graph, rootPath, warnings };
}
