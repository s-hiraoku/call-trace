export const VALID_CONFIDENCES = ["EXTRACTED", "INFERRED", "AMBIGUOUS"] as const;
export type Confidence = (typeof VALID_CONFIDENCES)[number];

export const VALID_FILE_TYPES = ["code", "document"] as const;
export type FileType = (typeof VALID_FILE_TYPES)[number];

export const VALID_RELATIONS = [
  "contains",
  "method",
  "calls",
  "imports",
  "imports_from",
  "inherits",
  "references",
  "uses",
] as const;
export type Relation = (typeof VALID_RELATIONS)[number];

export interface GraphNode {
  id: string;
  label: string;
  file_type: FileType;
  source_file: string;
  source_location?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: Relation;
  confidence: Confidence;
  confidence_score?: number;
  source_file: string;
  source_location?: string;
  weight?: number;
  context?: string;
  metadata?: Record<string, unknown>;
}

export interface ExtractionResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CallTraceGraph {
  directed: boolean;
  multigraph: boolean;
  graph: {
    root?: string;
    analyzed_at?: string;
    file_count?: number;
  };
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface RawCall {
  callerId: string;
  calleeName: string;
  line: number;
  sourceFile: string;
  isQualified: boolean;
  importAlias?: string;
}

export interface FileExtraction extends ExtractionResult {
  sourceFile: string;
  rawCalls: RawCall[];
  imports: Map<string, string>;
}
