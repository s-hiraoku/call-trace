import type { CallTraceGraph, GraphEdge, GraphNode } from "../graph/types";

export interface ScoredNode {
  node: GraphNode;
  score: number;
}

export interface PathResult {
  found: boolean;
  hops: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  path: string[];
}

export interface ExplainResult {
  node: GraphNode | null;
  incoming: GraphEdge[];
  outgoing: GraphEdge[];
  callers: GraphNode[];
  callees: GraphNode[];
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function findNodes(graph: CallTraceGraph, query: string, limit = 20): ScoredNode[] {
  const terms = normalizeQuery(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored: ScoredNode[] = [];

  for (const node of graph.nodes) {
    const haystack = `${node.label} ${node.id} ${node.source_file}`.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (node.label.toLowerCase() === term) score += 100;
      else if (node.id === term) score += 90;
      else if (node.label.toLowerCase().startsWith(term)) score += 50;
      else if (haystack.includes(term)) score += 10;
    }

    if (score > 0) scored.push({ node, score });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function getNode(graph: CallTraceGraph, identifier: string): GraphNode | null {
  const normalized = normalizeQuery(identifier);
  return (
    graph.nodes.find(
      (node) =>
        node.id === identifier ||
        node.id === normalized ||
        node.label.toLowerCase() === normalized,
    ) ?? null
  );
}

function adjacency(graph: CallTraceGraph): Map<string, Array<{ target: string; edge: GraphEdge }>> {
  const map = new Map<string, Array<{ target: string; edge: GraphEdge }>>();
  for (const edge of graph.links) {
    const existing = map.get(edge.source) ?? [];
    existing.push({ target: edge.target, edge });
    map.set(edge.source, existing);
  }
  return map;
}

function reverseAdjacency(graph: CallTraceGraph): Map<string, Array<{ source: string; edge: GraphEdge }>> {
  const map = new Map<string, Array<{ source: string; edge: GraphEdge }>>();
  for (const edge of graph.links) {
    const existing = map.get(edge.target) ?? [];
    existing.push({ source: edge.source, edge });
    map.set(edge.target, existing);
  }
  return map;
}

export function shortestPath(
  graph: CallTraceGraph,
  sourceId: string,
  targetId: string,
  relationFilter?: string[],
): PathResult {
  const sourceNode = getNode(graph, sourceId);
  const targetNode = getNode(graph, targetId);

  if (!sourceNode || !targetNode) {
    return { found: false, hops: 0, nodes: [], edges: [], path: [] };
  }

  const adj = adjacency(graph);
  const queue: Array<{ id: string; path: string[]; edges: GraphEdge[] }> = [
    { id: sourceNode.id, path: [sourceNode.id], edges: [] },
  ];
  const visited = new Set<string>([sourceNode.id]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.id === targetNode.id) {
      const nodes = current.path
        .map((id) => graph.nodes.find((node) => node.id === id))
        .filter((node): node is GraphNode => Boolean(node));
      return {
        found: true,
        hops: current.edges.length,
        nodes,
        edges: current.edges,
        path: current.path,
      };
    }

    for (const next of adj.get(current.id) ?? []) {
      if (relationFilter && !relationFilter.includes(next.edge.relation)) continue;
      if (visited.has(next.target)) continue;
      visited.add(next.target);
      queue.push({
        id: next.target,
        path: [...current.path, next.target],
        edges: [...current.edges, next.edge],
      });
    }
  }

  return { found: false, hops: 0, nodes: [], edges: [], path: [] };
}

export function explainNode(graph: CallTraceGraph, identifier: string): ExplainResult {
  const node = getNode(graph, identifier);
  if (!node) {
    return { node: null, incoming: [], outgoing: [], callers: [], callees: [] };
  }

  const incoming = graph.links.filter((edge) => edge.target === node.id);
  const outgoing = graph.links.filter((edge) => edge.source === node.id);

  const callerIds = incoming.filter((edge) => edge.relation === "calls").map((edge) => edge.source);
  const calleeIds = outgoing.filter((edge) => edge.relation === "calls").map((edge) => edge.target);

  const callers = callerIds
    .map((id) => graph.nodes.find((item) => item.id === id))
    .filter((item): item is GraphNode => Boolean(item));
  const callees = calleeIds
    .map((id) => graph.nodes.find((item) => item.id === id))
    .filter((item): item is GraphNode => Boolean(item));

  return { node, incoming, outgoing, callers, callees };
}

export function listCallers(graph: CallTraceGraph, identifier: string): GraphNode[] {
  return explainNode(graph, identifier).callers;
}

export function formatPath(pathResult: PathResult, graph: CallTraceGraph): string {
  if (!pathResult.found) return "No path found.";

  const parts: string[] = [`Shortest path (${pathResult.hops} hops):`];
  for (let i = 0; i < pathResult.edges.length; i++) {
    const edge = pathResult.edges[i]!;
    const from = graph.nodes.find((node) => node.id === edge.source);
    const to = graph.nodes.find((node) => node.id === edge.target);
    if (i === 0 && from) {
      parts.push(`  ${from.label}`);
    }
    parts.push(
      `  --${edge.relation} [${edge.confidence}]--> ${to?.label ?? edge.target} at=${edge.source_file}:${edge.source_location ?? ""}`,
    );
  }
  return parts.join("\n");
}

export function formatExplain(result: ExplainResult): string {
  if (!result.node) return "Node not found.";
  const lines = [
    `Node: ${result.node.label}`,
    `  ID:     ${result.node.id}`,
    `  Source: ${result.node.source_file} ${result.node.source_location ?? ""}`,
    `  Type:   ${result.node.type ?? "unknown"}`,
    "",
    `Callers (${result.callers.length}):`,
    ...result.callers.map((caller) => `  <-- ${caller.label} (${caller.source_file})`),
    "",
    `Callees (${result.callees.length}):`,
    ...result.callees.map((callee) => `  --> ${callee.label} (${callee.source_file})`),
  ];
  return lines.join("\n");
}
