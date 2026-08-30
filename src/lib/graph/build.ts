import { confidenceScore } from "./ids";
import type { CallTraceGraph, GraphEdge, GraphNode } from "./types";

function edgeKey(edge: GraphEdge): string {
  return [
    edge.source,
    edge.target,
    edge.relation,
    edge.confidence,
    edge.source_file,
    edge.source_location ?? "",
  ].join("|");
}

export function mergeExtractions(
  fragments: Array<{ nodes: GraphNode[]; edges: GraphEdge[] }>,
  meta: { root: string; fileCount: number },
): CallTraceGraph {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  for (const fragment of fragments) {
    for (const node of fragment.nodes) {
      nodeMap.set(node.id, node);
    }
    for (const edge of fragment.edges) {
      const normalized: GraphEdge = {
        ...edge,
        confidence_score: edge.confidence_score ?? confidenceScore(edge.confidence),
        weight: edge.weight ?? 1,
      };
      edgeMap.set(edgeKey(normalized), normalized);
    }
  }

  return {
    directed: true,
    multigraph: false,
    graph: {
      root: meta.root,
      analyzed_at: new Date().toISOString(),
      file_count: meta.fileCount,
    },
    nodes: Array.from(nodeMap.values()),
    links: Array.from(edgeMap.values()),
  };
}

export function graphStats(graph: CallTraceGraph) {
  const relationCounts: Record<string, number> = {};
  const confidenceCounts: Record<string, number> = {};

  for (const link of graph.links) {
    relationCounts[link.relation] = (relationCounts[link.relation] ?? 0) + 1;
    confidenceCounts[link.confidence] = (confidenceCounts[link.confidence] ?? 0) + 1;
  }

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.links.length,
    relationCounts,
    confidenceCounts,
  };
}
