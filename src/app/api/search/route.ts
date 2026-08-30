import { NextResponse } from "next/server";
import { loadGraph } from "@/lib/graph/storage";
import { findNodes } from "@/lib/query/engine";

export async function GET(request: Request) {
  const graph = await loadGraph();
  if (!graph) {
    return NextResponse.json({ ok: false, error: "No graph found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? "20");
  const results = findNodes(graph, q, limit);

  return NextResponse.json({
    ok: true,
    query: q,
    results: results.map(({ node, score }) => ({ ...node, score })),
  });
}
