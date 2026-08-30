import { NextResponse } from "next/server";
import { loadGraph } from "@/lib/graph/storage";
import { explainNode, formatExplain } from "@/lib/query/engine";

export async function GET(request: Request) {
  const graph = await loadGraph();
  if (!graph) {
    return NextResponse.json({ ok: false, error: "No graph found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  const result = explainNode(graph, id);
  if (!result.node) {
    return NextResponse.json({ ok: false, error: "Node not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    ...result,
    text: formatExplain(result),
  });
}
