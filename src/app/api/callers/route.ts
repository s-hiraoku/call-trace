import { NextResponse } from "next/server";
import { loadGraph } from "@/lib/graph/storage";
import { listCallers } from "@/lib/query/engine";

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

  const callers = listCallers(graph, id);
  return NextResponse.json({
    ok: true,
    id,
    count: callers.length,
    callers,
  });
}
