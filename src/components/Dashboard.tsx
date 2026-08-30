"use client";

import { useEffect, useState } from "react";
import type { GraphEdge, GraphNode } from "@/lib/graph/types";
import { AnalyzeForm } from "@/components/AnalyzeForm";
import { SearchPanel } from "@/components/SearchPanel";
import { PathFinder } from "@/components/PathFinder";
import { GraphView } from "@/components/GraphView";

interface GraphStats {
  nodeCount: number;
  edgeCount: number;
}

export function Dashboard() {
  const [graphLoaded, setGraphLoaded] = useState(false);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [explainText, setExplainText] = useState<string | null>(null);
  const [callers, setCallers] = useState<GraphNode[]>([]);
  const [pathIds, setPathIds] = useState<string[]>([]);
  const [jsonPreview, setJsonPreview] = useState<string>("");

  async function refreshGraph() {
    const response = await fetch("/api/graph");
    if (!response.ok) {
      setGraphLoaded(false);
      return;
    }
    const data = await response.json();
    setGraphLoaded(true);
    setStats(data.stats);
    setNodes(data.graph.nodes ?? []);
    setEdges(data.graph.links ?? []);
    setJsonPreview(JSON.stringify(data.graph, null, 2));
  }

  useEffect(() => {
    void refreshGraph();
  }, []);

  async function handleSelectNode(node: GraphNode) {
    setSelectedNode(node);
    const [explainRes, callersRes] = await Promise.all([
      fetch(`/api/explain?id=${encodeURIComponent(node.id)}`),
      fetch(`/api/callers?id=${encodeURIComponent(node.id)}`),
    ]);
    const explainData = await explainRes.json();
    const callersData = await callersRes.json();
    setExplainText(explainData.text ?? null);
    setCallers(callersData.callers ?? []);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">CallTrace</p>
        <h1 className="text-3xl font-semibold">コードベース呼び出しグラフ</h1>
        <p className="max-w-3xl text-zinc-400">
          ローカル優先。tree-sitter で関数・クラス・呼び出し関係を抽出し、
          「誰から呼ばれているか」「A から B までの経路は？」を即答します。
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <AnalyzeForm onAnalyzed={refreshGraph} />
          {stats ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
              <p>Nodes: {stats.nodeCount}</p>
              <p>Edges: {stats.edgeCount}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {graphLoaded ? "グラフ読み込み済み (.calltrace/graph.json)" : "未解析"}
              </p>
            </div>
          ) : null}
          <SearchPanel onSelect={handleSelectNode} />
          <PathFinder
            selectedNode={selectedNode}
            onPathFound={(pathNodes, _pathEdges, path) => setPathIds(path)}
          />
        </div>

        <div className="space-y-4">
          <GraphView nodes={nodes} edges={edges} highlightPath={pathIds} />

          {selectedNode ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <h3 className="mb-2 text-sm font-medium text-zinc-300">ノード説明</h3>
                <pre className="whitespace-pre-wrap text-xs text-zinc-400">{explainText}</pre>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <h3 className="mb-2 text-sm font-medium text-zinc-300">
                  呼び出し元 ({callers.length})
                </h3>
                <ul className="space-y-1 text-sm">
                  {callers.map((caller) => (
                    <li key={caller.id} className="rounded bg-zinc-900 px-2 py-1">
                      {caller.label}
                      <span className="ml-2 text-xs text-zinc-500">{caller.source_file}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-300">JSON</h3>
            <pre className="max-h-96 overflow-auto text-xs text-zinc-400">{jsonPreview || "{}"}</pre>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="mb-2 text-sm font-medium text-zinc-300">Agent API</h2>
        <ul className="grid gap-1 font-mono text-xs text-zinc-400 md:grid-cols-2">
          <li>POST /api/analyze {"{ source }"}</li>
          <li>GET /api/graph</li>
          <li>GET /api/search?q=...</li>
          <li>GET /api/path?source=...&target=...</li>
          <li>GET /api/explain?id=...</li>
          <li>GET /api/callers?id=...</li>
        </ul>
      </section>
    </div>
  );
}
