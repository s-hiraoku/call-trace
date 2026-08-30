import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeRepository } from "@/lib/repo/analyze";
import { saveGraph } from "@/lib/graph/storage";
import { graphStats } from "@/lib/graph/build";

const bodySchema = z.object({
  source: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await analyzeRepository({ source: body.source });
    const graphPath = await saveGraph(result.graph);

    return NextResponse.json({
      ok: true,
      graphPath,
      stats: graphStats(result.graph),
      warnings: result.warnings,
      rootPath: result.rootPath,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 400 },
    );
  }
}
