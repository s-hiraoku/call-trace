"use client";

import { useState } from "react";
import type { GraphEdge, GraphNode } from "@/lib/graph/types";

interface PathFinderProps {
  selectedNode?: GraphNode | null;
  onPathFound: (nodes: GraphNode[], edges: GraphEdge[], path: string[]) => void;
}

export function PathFinder({ selectedNode, onPathFound }: PathFinderProps) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleFindPath(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(
      `/api/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`,
    );
    const data = await response.json();
    if (!data.ok || !data.found) {
      setMessage("経路が見つかりませんでした");
      onPathFound([], [], []);
      return;
    }
    setMessage(data.text);
    onPathFound(data.nodes ?? [], data.edges ?? [], data.path ?? []);
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-300">最短経路</h3>
      <form onSubmit={handleFindPath} className="space-y-2">
        <input
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder={selectedNode ? `起点 (${selectedNode.label})` : "起点 ID / ラベル"}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="終点 ID / ラベル"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">
          経路を表示
        </button>
      </form>
      {message ? <pre className="mt-3 whitespace-pre-wrap text-xs text-zinc-400">{message}</pre> : null}
    </div>
  );
}
