import {
  VALID_CONFIDENCES,
  VALID_FILE_TYPES,
  VALID_RELATIONS,
  type GraphEdge,
  type GraphNode,
} from "./types";

export interface ValidationIssue {
  path: string;
  message: string;
}

export function validateNode(node: GraphNode, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const prefix = `nodes[${index}]`;

  if (!node.id || !/^[a-z0-9_]+$/.test(node.id)) {
    issues.push({ path: `${prefix}.id`, message: "id must be lowercase snake_case" });
  }
  if (!node.label) {
    issues.push({ path: `${prefix}.label`, message: "label is required" });
  }
  if (!VALID_FILE_TYPES.includes(node.file_type)) {
    issues.push({ path: `${prefix}.file_type`, message: "invalid file_type" });
  }
  if (!node.source_file) {
    issues.push({ path: `${prefix}.source_file`, message: "source_file is required" });
  }

  return issues;
}

export function validateEdge(edge: GraphEdge, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const prefix = `links[${index}]`;

  if (!edge.source || !edge.target) {
    issues.push({ path: prefix, message: "source and target are required" });
  }
  if (!VALID_RELATIONS.includes(edge.relation)) {
    issues.push({ path: `${prefix}.relation`, message: "invalid relation" });
  }
  if (!VALID_CONFIDENCES.includes(edge.confidence)) {
    issues.push({ path: `${prefix}.confidence`, message: "invalid confidence" });
  }
  if (!edge.source_file) {
    issues.push({ path: `${prefix}.source_file`, message: "source_file is required" });
  }

  return issues;
}

export function validateExtraction(result: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}): ValidationIssue[] {
  return [
    ...result.nodes.flatMap((node, index) => validateNode(node, index)),
    ...result.edges.flatMap((edge, index) => validateEdge(edge, index)),
  ];
}
