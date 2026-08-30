import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { extractFile } from "@/lib/extract/engine";
import { resolveCrossFileCalls } from "@/lib/extract/symbol-resolution";
import { mergeExtractions } from "@/lib/graph/build";
import { shortestPath, explainNode, findNodes } from "@/lib/query/engine";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

function writeFixture(name: string, content: string): { root: string; relative: string; absolute: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "calltrace-fixture-"));
  tempDirs.push(root);
  const relative = name;
  const absolute = path.join(root, name);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
  return { root, relative, absolute };
}

describe("extract + query integration", () => {
  it("extracts functions and call edges from TypeScript fixture", () => {
    const a = writeFixture(
      "src/a.ts",
      `import { helper } from "./b";

export function main() {
  helper();
}
`,
    );
    const b = writeFixture(
      "src/b.ts",
      `export function helper() {
  return 1;
}
`,
    );

    const extractionA = extractFile(a.absolute, a.relative, "typescript");
    const extractionB = extractFile(b.absolute, b.relative, "typescript");
    const resolved = resolveCrossFileCalls([extractionA, extractionB]);

    const graph = mergeExtractions(
      [
        { nodes: extractionA.nodes, edges: extractionA.edges },
        { nodes: extractionB.nodes, edges: extractionB.edges },
        { nodes: [], edges: resolved },
      ],
      { root: a.root, fileCount: 2 },
    );

    expect(graph.nodes.some((node) => node.label === "main")).toBe(true);
    expect(graph.nodes.some((node) => node.label === "helper")).toBe(true);
    expect(graph.links.some((edge) => edge.relation === "calls")).toBe(true);

    const mainNode = graph.nodes.find((node) => node.label === "main");
    const helperNode = graph.nodes.find((node) => node.label === "helper");
    expect(mainNode).toBeTruthy();
    expect(helperNode).toBeTruthy();

    const pathResult = shortestPath(graph, mainNode!.id, helperNode!.id);
    expect(pathResult.found).toBe(true);

    const explain = explainNode(graph, helperNode!.id);
    expect(explain.callers.length).toBeGreaterThan(0);

    const search = findNodes(graph, "helper");
    expect(search[0]?.node.label).toBe("helper");
  });
});
