import fs from "fs/promises";
import path from "path";
import type { CallTraceGraph } from "./types";

const OUTPUT_DIR = ".calltrace";

export function getOutputDir(cwd: string = process.cwd()): string {
  return path.join(cwd, OUTPUT_DIR);
}

export function getGraphPath(cwd: string = process.cwd()): string {
  return path.join(getOutputDir(cwd), "graph.json");
}

export async function saveGraph(graph: CallTraceGraph, cwd: string = process.cwd()): Promise<string> {
  const dir = getOutputDir(cwd);
  await fs.mkdir(dir, { recursive: true });
  const graphPath = path.join(dir, "graph.json");
  await fs.writeFile(graphPath, JSON.stringify(graph, null, 2), "utf8");
  return graphPath;
}

export async function loadGraph(cwd: string = process.cwd()): Promise<CallTraceGraph | null> {
  const graphPath = getGraphPath(cwd);
  try {
    const raw = await fs.readFile(graphPath, "utf8");
    return JSON.parse(raw) as CallTraceGraph;
  } catch {
    return null;
  }
}

export async function graphExists(cwd: string = process.cwd()): Promise<boolean> {
  try {
    await fs.access(getGraphPath(cwd));
    return true;
  } catch {
    return false;
  }
}
