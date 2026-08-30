"use client";

import type { GraphEdge, GraphNode } from "@/lib/graph/types";

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightPath?: string[];
}

export function GraphView({ nodes, edges, highlightPath = [] }: GraphViewProps) {
  const highlight = new Set(highlightPath);
  const visibleNodes = highlightPath.length > 0
    ? nodes.filter((node) => highlight.has(node.id))
    : nodes.slice(0, 40);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  ).slice(0, 60);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-300">グラフビュー</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Nodes ({visibleNodes.length})</p>
          <ul className="max-h-72 space-y-1 overflow-auto text-sm">
            {visibleNodes.map((node) => (
              <li
                key={node.id}
                className={`rounded px-2 py-1 ${highlight.has(node.id) ? "bg-sky-900/40 text-sky-200" : "bg-zinc-900"}`}
              >
                <span className="font-medium">{node.label}</span>
                <span className="ml-2 text-xs text-zinc-500">{node.source_file}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Edges ({visibleEdges.length})</p>
          <ul className="max-h-72 space-y-1 overflow-auto font-mono text-xs">
            {visibleEdges.map((edge, index) => (
              <li key={`${edge.source}-${edge.target}-${index}`} className="rounded bg-zinc-900 px-2 py-1">
                {edge.source} --{edge.relation} [{edge.confidence}]--&gt; {edge.target}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
