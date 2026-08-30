import { NextResponse } from "next/server";
import { loadGraph } from "@/lib/graph/storage";
import { shortestPath, formatPath } from "@/lib/query/engine";

export async function GET(request: Request) {
  const graph = await loadGraph();
  if (!graph) {
    return NextResponse.json({ ok: false, error: "No graph found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const target = searchParams.get("target");

  if (!source || !target) {
    return NextResponse.json({ ok: false, error: "source and target are required" }, { status: 400 });
  }

  const result = shortestPath(graph, source, target);
  return NextResponse.json({
    ok: true,
    found: result.found,
    hops: result.hops,
    path: result.path,
    nodes: result.nodes,
    edges: result.edges,
    text: formatPath(result, graph),
  });
}
