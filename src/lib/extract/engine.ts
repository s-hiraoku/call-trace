import fs from "fs";
import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import Python from "tree-sitter-python";
import { makeId, fileStem } from "../graph/ids";
import type { FileExtraction, GraphEdge, GraphNode, RawCall } from "../graph/types";

type Language = "typescript" | "javascript" | "python";

interface ParsedSymbol {
  id: string;
  label: string;
  type: "function" | "class" | "method";
  line: number;
  parentClassId?: string;
}

function getParser(language: Language): Parser {
  const parser = new Parser();
  switch (language) {
    case "typescript":
      parser.setLanguage(TypeScript.typescript);
      break;
    case "javascript":
      parser.setLanguage(JavaScript);
      break;
    case "python":
      parser.setLanguage(Python);
      break;
  }
  return parser;
}

function nodeText(source: Buffer, node: Parser.SyntaxNode): string {
  return source.subarray(node.startIndex, node.endIndex).toString("utf8");
}

function collectImports(
  source: Buffer,
  root: Parser.SyntaxNode,
  language: Language,
): Map<string, string> {
  const imports = new Map<string, string>();

  function walk(node: Parser.SyntaxNode): void {
    if (language === "python") {
      if (node.type === "import_statement") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          imports.set(nodeText(source, nameNode), nodeText(source, nameNode));
        }
      }
      if (node.type === "import_from_statement") {
        const moduleNode = node.childForFieldName("module_name");
        const moduleName = moduleNode ? nodeText(source, moduleNode) : "";
        for (const child of node.namedChildren) {
          if (child.type === "dotted_name" || child.type === "aliased_import") {
            const aliasNode = child.childForFieldName("alias");
            const nameNode = child.childForFieldName("name") ?? child;
            const localName = aliasNode
              ? nodeText(source, aliasNode)
              : nodeText(source, nameNode);
            imports.set(localName, moduleName);
          }
        }
      }
    } else {
      if (node.type === "import_statement") {
        const sourceNode = node.childForFieldName("source");
        if (sourceNode) {
          const modulePath = nodeText(source, sourceNode).replace(/['"]/g, "");
          imports.set(modulePath.split("/").pop() ?? modulePath, modulePath);
        }
      }
      if (node.type === "import_declaration") {
        const sourceNode = node.childForFieldName("source");
        const modulePath = sourceNode
          ? nodeText(source, sourceNode).replace(/['"]/g, "")
          : "";
        for (const child of node.namedChildren) {
          if (child.type === "import_clause") {
            for (const spec of child.namedChildren) {
              if (spec.type === "identifier") {
                imports.set(nodeText(source, spec), modulePath);
              }
              if (spec.type === "named_imports") {
                for (const named of spec.namedChildren) {
                  if (named.type === "import_specifier") {
                    const aliasNode = named.childForFieldName("alias");
                    const nameNode = named.childForFieldName("name");
                    if (nameNode) {
                      const localName = aliasNode
                        ? nodeText(source, aliasNode)
                        : nodeText(source, nameNode);
                      imports.set(localName, modulePath);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    for (const child of node.namedChildren) walk(child);
  }

  walk(root);
  return imports;
}

function extractSymbols(
  source: Buffer,
  root: Parser.SyntaxNode,
  relativeFile: string,
  language: Language,
): { symbols: ParsedSymbol[]; fileNodeId: string } {
  const stem = fileStem(relativeFile);
  const fileNodeId = makeId(stem);
  const symbols: ParsedSymbol[] = [];

  function registerSymbol(
    name: string,
    type: ParsedSymbol["type"],
    line: number,
    parentClassId?: string,
  ): string {
    const id = parentClassId ? makeId(stem, parentClassId.split("_").pop()!, name) : makeId(stem, name);
    symbols.push({ id, label: name, type, line, parentClassId });
    return id;
  }

  function walk(node: Parser.SyntaxNode, currentClassId?: string): void {
    if (language === "python") {
      if (node.type === "class_definition") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          const classId = registerSymbol(nodeText(source, nameNode), "class", node.startPosition.row + 1);
          for (const child of node.namedChildren) walk(child, classId);
          return;
        }
      }
      if (node.type === "function_definition") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          registerSymbol(
            nodeText(source, nameNode),
            currentClassId ? "method" : "function",
            node.startPosition.row + 1,
            currentClassId,
          );
        }
      }
    } else {
      if (node.type === "class_declaration") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          const classId = registerSymbol(nodeText(source, nameNode), "class", node.startPosition.row + 1);
          for (const child of node.namedChildren) walk(child, classId);
          return;
        }
      }
      if (
        node.type === "function_declaration" ||
        node.type === "method_definition" ||
        node.type === "arrow_function"
      ) {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          registerSymbol(
            nodeText(source, nameNode),
            currentClassId ? "method" : "function",
            node.startPosition.row + 1,
            currentClassId,
          );
        }
      }
    }

    for (const child of node.namedChildren) walk(child, currentClassId);
  }

  walk(root);
  return { symbols, fileNodeId };
}

function collectCallsInScope(
  source: Buffer,
  scopeNode: Parser.SyntaxNode,
  callerId: string,
  sourceFile: string,
  rawCalls: RawCall[],
): void {
  function walk(node: Parser.SyntaxNode): void {
    if (node.type === "call_expression" || node.type === "call") {
      const fnNode = node.childForFieldName("function") ?? node.namedChild(0);
      if (fnNode) {
        const text = nodeText(source, fnNode);
        const isQualified = text.includes(".");
        const parts = text.split(".");
        const calleeName = parts[parts.length - 1] ?? text;
        rawCalls.push({
          callerId,
          calleeName,
          line: node.startPosition.row + 1,
          sourceFile,
          isQualified,
          importAlias: isQualified ? parts[0] : undefined,
        });
      }
    }
    for (const child of node.namedChildren) walk(child);
  }
  walk(scopeNode);
}

function findScopeNode(
  source: Buffer,
  root: Parser.SyntaxNode,
  symbol: ParsedSymbol,
  language: Language,
): Parser.SyntaxNode | null {
  let found: Parser.SyntaxNode | null = null;

  function walk(node: Parser.SyntaxNode): void {
    if (found) return;
    const isFunctionNode =
      language === "python"
        ? node.type === "function_definition"
        : node.type === "function_declaration" ||
          node.type === "method_definition" ||
          node.type === "arrow_function";

    if (isFunctionNode) {
      const nameNode = node.childForFieldName("name");
      if (nameNode && nodeText(source, nameNode) === symbol.label) {
        if (node.startPosition.row + 1 === symbol.line) {
          found = node;
          return;
        }
      }
    }
    for (const child of node.namedChildren) walk(child);
  }

  walk(root);
  return found;
}

export function extractFile(
  absolutePath: string,
  relativeFile: string,
  language: Language,
): FileExtraction {
  const sourceText = fs.readFileSync(absolutePath, "utf8");
  const source = Buffer.from(sourceText, "utf8");
  const parser = getParser(language);
  const tree = parser.parse(sourceText);
  const root = tree.rootNode;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const rawCalls: RawCall[] = [];

  const { symbols, fileNodeId } = extractSymbols(source, root, relativeFile, language);
  const imports = collectImports(source, root, language);

  nodes.push({
    id: fileNodeId,
    label: relativeFile,
    file_type: "code",
    source_file: relativeFile,
    type: "file",
  });

  for (const symbol of symbols) {
    nodes.push({
      id: symbol.id,
      label: symbol.label,
      file_type: "code",
      source_file: relativeFile,
      source_location: `L${symbol.line}`,
      type: symbol.type,
    });

    if (symbol.parentClassId) {
      edges.push({
        source: symbol.parentClassId,
        target: symbol.id,
        relation: "method",
        confidence: "EXTRACTED",
        confidence_score: 1.0,
        source_file: relativeFile,
        source_location: `L${symbol.line}`,
        context: "definition",
      });
    } else {
      edges.push({
        source: fileNodeId,
        target: symbol.id,
        relation: "contains",
        confidence: "EXTRACTED",
        confidence_score: 1.0,
        source_file: relativeFile,
        source_location: `L${symbol.line}`,
        context: "definition",
      });
    }

    const scopeNode = findScopeNode(source, root, symbol, language);
    if (scopeNode) {
      collectCallsInScope(source, scopeNode, symbol.id, relativeFile, rawCalls);
    }
  }

  for (const [localName, modulePath] of imports.entries()) {
    const importTargetId = makeId(modulePath.replace(/[/\\.-]/g, "_"));
    edges.push({
      source: fileNodeId,
      target: importTargetId,
      relation: "imports",
      confidence: "EXTRACTED",
      confidence_score: 1.0,
      source_file: relativeFile,
      context: localName,
      metadata: { localName, modulePath },
    });
  }

  return {
    sourceFile: relativeFile,
    nodes,
    edges,
    rawCalls,
    imports,
  };
}
