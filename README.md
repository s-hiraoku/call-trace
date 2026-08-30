# CallTrace

CallTrace は、コードベースを知識グラフ化し、「この関数は誰から呼ばれている？」「A から B までの経路は？」を即答するローカル優先の Next.js アプリです。

Graphify の設計思想（EXTRACTED / INFERRED 区別、NetworkX 互換 JSON、query/path/explain）を受け継ぎ、人間向けダッシュボードとエージェント向け API の両方を提供します。

## 機能（v1）

- リポジトリパスまたは GitHub URL を入力して解析
- tree-sitter による関数・クラス・インポート・呼び出し関係の抽出
- `.calltrace/graph.json` へのローカル保存
- シンボル検索、最短経路、ノード説明、呼び出し元一覧
- 対話式グラフビュー + JSON 表示
- コード解析はオンデバイス（外部送信なし）

## 対応言語

- TypeScript / TSX
- JavaScript / JSX
- Python

## セットアップ

```bash
cd calltrace
npm install
npm run dev
```

http://localhost:3000 を開き、ローカルリポジトリパスまたは GitHub URL を入力してください。

## Agent API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analyze` | `{ "source": "/path or https://github.com/org/repo" }` |
| GET | `/api/graph` | 保存済みグラフ全体 |
| GET | `/api/search?q=...` | シンボル検索 |
| GET | `/api/path?source=...&target=...` | 最短経路 |
| GET | `/api/explain?id=...` | ノード説明 |
| GET | `/api/callers?id=...` | 呼び出し元一覧 |

## グラフモデル

### ノード

```json
{
  "id": "src_api_handler_process",
  "label": "process",
  "file_type": "code",
  "source_file": "src/api/handler.ts",
  "source_location": "L10",
  "type": "function"
}
```

### エッジ

```json
{
  "source": "src_api_handler_main",
  "target": "src_utils_helper",
  "relation": "calls",
  "confidence": "EXTRACTED",
  "confidence_score": 1.0,
  "source_file": "src/api/handler.ts",
  "source_location": "L12",
  "context": "import_guided_call"
}
```

- **EXTRACTED**: AST 上で明示的（import 解決済み呼び出し、contains、imports など）
- **INFERRED**: ヒューリスティック解決（同一シンボル名の推定など）
- **AMBIGUOUS**: 複数候補が tie した場合

## テスト

```bash
npm test
```

## 参考

- [Graphify](https://github.com/Graphify-Labs/graphify) — 抽出スキーマと query API
- [Archify](https://github.com/tt-a1i/archify) — グラフ UI の探索パターン
- [tree-sitter](https://github.com/tree-sitter/tree-sitter) — オンデバイス構文解析

## ライセンス

MIT
