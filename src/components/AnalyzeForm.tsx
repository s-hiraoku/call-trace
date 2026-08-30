"use client";

import { useState } from "react";

interface AnalyzeFormProps {
  onAnalyzed: () => void;
}

export function AnalyzeForm({ onAnalyzed }: AnalyzeFormProps) {
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }
      setMessage(
        `解析完了: ${data.stats.nodeCount} nodes, ${data.stats.edgeCount} edges`,
      );
      onAnalyzed();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div>
        <label htmlFor="source" className="mb-1 block text-sm text-zinc-400">
          リポジトリパスまたは GitHub URL
        </label>
        <input
          id="source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="/path/to/repo または https://github.com/org/repo"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !source.trim()}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "解析中..." : "解析開始"}
      </button>
      {message ? <p className="text-sm text-zinc-300">{message}</p> : null}
    </form>
  );
}
