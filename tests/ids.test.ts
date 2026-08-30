import path from "path";
import { describe, expect, it } from "vitest";
import { makeId, normalizeId, confidenceScore } from "@/lib/graph/ids";

describe("ids", () => {
  it("normalizes labels to stable snake_case ids", () => {
    expect(normalizeId("src/Auth/Session.ts")).toBe("src_auth_session_ts");
    expect(makeId("src_auth_session", "validateToken")).toBe("src_auth_session_validatetoken");
  });

  it("maps confidence tiers to scores", () => {
    expect(confidenceScore("EXTRACTED")).toBe(1.0);
    expect(confidenceScore("INFERRED")).toBe(0.85);
    expect(confidenceScore("AMBIGUOUS")).toBe(0.2);
  });
});

describe("makeId with file stems", () => {
  it("builds path-qualified ids", () => {
    const id = makeId("src_api_handler", "processRequest");
    expect(id).toMatch(/^[a-z0-9_]+$/);
    expect(id).toContain("processrequest");
  });
});
