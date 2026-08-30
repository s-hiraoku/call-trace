import { NextResponse } from "next/server";
import { loadGraph } from "@/lib/graph/storage";
import { graphStats } from "@/lib/graph/build";

export async function GET() {
  const graph = await loadGraph();
  if (!graph) {
    return NextResponse.json({ ok: false, error: "No graph found. Run analysis first." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    graph,
    stats: graphStats(graph),
  });
}
