import { makeId, fileStem } from "../graph/ids";
import type { Confidence, FileExtraction, GraphEdge } from "../graph/types";

function findNodesByLabel(
  label: string,
  extractions: FileExtraction[],
): string[] {
  const normalized = label.toLowerCase();
  const matches: string[] = [];

  for (const extraction of extractions) {
    for (const node of extraction.nodes) {
      if (
        node.label.toLowerCase() === normalized ||
        node.id.endsWith(`_${normalized}`) ||
        node.id.includes(normalized)
      ) {
        matches.push(node.id);
      }
    }
  }

  return [...new Set(matches)];
}

function resolveImportTarget(
  modulePath: string,
  extractions: FileExtraction[],
): string | null {
  const candidates = extractions.filter((extraction) => {
    const withoutExt = extraction.sourceFile.replace(/\.[^.]+$/, "");
    return (
      withoutExt.endsWith(modulePath) ||
      withoutExt.endsWith(`/${modulePath}`) ||
      extraction.sourceFile.includes(modulePath)
    );
  });

  if (candidates.length === 1) {
    return makeId(fileStem(candidates[0]!.sourceFile));
  }

  return null;
}

export function resolveCrossFileCalls(extractions: FileExtraction[]): GraphEdge[] {
  const resolved: GraphEdge[] = [];
  const symbolIndex = new Map<string, string[]>();

  for (const extraction of extractions) {
    for (const node of extraction.nodes) {
      if (!node.type || node.type === "file") continue;
      const key = node.label.toLowerCase();
      const existing = symbolIndex.get(key) ?? [];
      existing.push(node.id);
      symbolIndex.set(key, existing);
    }
  }

  for (const extraction of extractions) {
    for (const rawCall of extraction.rawCalls) {
      let targets: string[] = [];
      let confidence: Confidence = "INFERRED";
      let confidenceScore = 0.85;
      let context = "call";

      if (rawCall.importAlias && extraction.imports.has(rawCall.importAlias)) {
        const modulePath = extraction.imports.get(rawCall.importAlias)!;
        const fileTarget = resolveImportTarget(modulePath, extractions);
        if (fileTarget) {
          const moduleMatches = findNodesByLabel(rawCall.calleeName, extractions).filter((id) =>
            id.startsWith(fileTarget.replace(/_file$/, "")) || id.includes(fileStem(modulePath)),
          );
          if (moduleMatches.length === 1) {
            targets = moduleMatches;
            confidence = "EXTRACTED";
            confidenceScore = 1.0;
            context = "import_guided_call";
          }
        }
      }

      if (targets.length === 0) {
        const matches = symbolIndex.get(rawCall.calleeName.toLowerCase()) ?? [];
        if (matches.length === 1) {
          targets = matches;
          confidence = "INFERRED";
          confidenceScore = 0.85;
        } else if (matches.length > 1) {
          targets = matches;
          confidence = "AMBIGUOUS";
          confidenceScore = 0.2;
        }
      }

      for (const target of targets) {
        if (target === rawCall.callerId) continue;
        resolved.push({
          source: rawCall.callerId,
          target,
          relation: "calls",
          confidence,
          confidence_score: confidenceScore,
          source_file: rawCall.sourceFile,
          source_location: `L${rawCall.line}`,
          context,
          weight: confidenceScore,
        });
      }
    }
  }

  return resolved;
}
