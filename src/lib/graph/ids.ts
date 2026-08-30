export function normalizeId(value: string): string {
  let normalized = value.normalize("NFKC").toLowerCase();
  normalized = normalized.replace(/[^\w]+/g, "_");
  normalized = normalized.replace(/_+/g, "_");
  return normalized.replace(/^_|_$/g, "");
}

export function fileStem(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.[^.]+$/, "");
  return withoutExt.replace(/[/\\]/g, "_");
}

export function makeId(...parts: string[]): string {
  const joined = parts
    .map((part) => part.trim().replace(/^[_./]+|[_./]+$/g, ""))
    .filter(Boolean)
    .join("_");
  return normalizeId(joined);
}

export function confidenceScore(confidence: string): number {
  switch (confidence) {
    case "EXTRACTED":
      return 1.0;
    case "INFERRED":
      return 0.85;
    case "AMBIGUOUS":
      return 0.2;
    default:
      return 0.55;
  }
}
