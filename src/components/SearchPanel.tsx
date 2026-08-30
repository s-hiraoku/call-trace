"use client";

import { useState } from "react";
import type { GraphNode } from "@/lib/graph/types";

interface SearchPanelProps {
  onSelect: (node: GraphNode) => void;
}

export function SearchPanel({ onSelect }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<GraphNode & { score: number }>>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <form onSubmit={handleSearch} className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="関数名・クラス名で検索"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
        >
          検索
        </button>
      </form>
      <ul className="max-h-64 space-y-1 overflow-auto text-sm">
        {results.map((node) => (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => onSelect(node)}
              className="w-full rounded px-2 py-2 text-left hover:bg-zinc-900"
            >
              <span className="font-medium">{node.label}</span>
              <span className="ml-2 text-xs text-zinc-500">{node.source_file}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
