import { describe, expect, it } from "vitest";
import { validateExtraction } from "@/lib/graph/validate";
import type { GraphEdge, GraphNode } from "@/lib/graph/types";

describe("validateExtraction", () => {
  it("accepts valid nodes and edges", () => {
    const nodes: GraphNode[] = [
      {
        id: "src_api_handler",
        label: "handler.ts",
        file_type: "code",
        source_file: "src/api/handler.ts",
      },
      {
        id: "src_api_handler_process",
        label: "process",
        file_type: "code",
        source_file: "src/api/handler.ts",
        source_location: "L10",
        type: "function",
      },
    ];
    const edges: GraphEdge[] = [
      {
        source: "src_api_handler",
        target: "src_api_handler_process",
        relation: "contains",
        confidence: "EXTRACTED",
        source_file: "src/api/handler.ts",
      },
    ];

    expect(validateExtraction({ nodes, edges })).toEqual([]);
  });

  it("flags invalid confidence", () => {
    const nodes: GraphNode[] = [
      {
        id: "bad",
        label: "x",
        file_type: "code",
        source_file: "x.ts",
      },
    ];
    const edges: GraphEdge[] = [
      {
        source: "bad",
        target: "bad",
        relation: "calls",
        confidence: "MAYBE" as "EXTRACTED",
        source_file: "x.ts",
      },
    ];
    const issues = validateExtraction({ nodes, edges });
    expect(issues.some((issue) => issue.path.includes("confidence"))).toBe(true);
  });
});
