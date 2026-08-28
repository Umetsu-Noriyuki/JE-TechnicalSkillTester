# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is in an early scaffolding stage: the only tracked file is `README.md`. `package.json`, `package-lock.json`, and `node_modules/` exist locally but are untracked — no source code, build config, or test config has been committed yet.

Per the README, the intended project is a technical/programming skills assessment test web page.

## Toolchain (from devDependencies, not yet wired up)

`package.json` declares devDependencies for a Google Apps Script project built with TypeScript and bundled via Rollup:

- `@google/clasp` + `@types/google-apps-script` — Google Apps Script CLI and type definitions
- `typescript`, `@rollup/plugin-typescript`, `@rollup/plugin-commonjs`, `@rollup/plugin-node-resolve`, `tslib` — TS compilation and bundling
- `vitest` — test runner
- `eslint`, `prettier` — linting/formatting

None of these are configured yet: there is no `tsconfig.json`, `rollup.config.*`, `.clasp.json`, ESLint/Prettier config, or `src/` directory. The only `npm` script defined is `test`, which is a placeholder (`echo "Error: no test specified" && exit 1`) — it does not run vitest. There are no build or lint scripts defined.

When adding the first real source files, expect to also need to add the corresponding config (`tsconfig.json`, `rollup.config.*`, `.clasp.json` for Apps Script deployment, and `npm` scripts for build/lint/test) since none currently exist.

# プロジェクト概要
このプロジェクトは、Google Apps Script (GAS) を `clasp` を使用してローカルで開発する環境です。
対象はコンテナバインドスクリプト（またはスタンドアロンスクリプト）です。
- 種類: Google Apps Script (GAS)
- 言語: TypeScript
- トランスパイルツール: Rollup
- デプロイツール: clasp
# Architecture & File System
- GAS環境上では `.gs` として扱われるローカル開発ファイル拡張子は `.js` や `.html` を使用する
- `appsscript.json` はGASのプロジェクト設定ファイル（マニフェスト）であるため、スコープ (oauthScopes) の追加や変更が必要な場合のみ慎重に編集すること
- `.clasp.json` には scriptId などが含まれるため、このファイルは変更しないこと
- サーバー側（バックエンド）の関数と、クライアント側（フロントエンドHTML内）の `<script>` 処理を明確に区別して実装すること

## ルール

- .env, credentials 等の機密ファイルを読み取り・編集・コミットしないこと
- シークレットやAPIキーをコードにハードコードしないこと
- rm -rf / や force push 等の破壊的コマンドを実行しないこと
- すべての応答は日本語で行う
- 実装前に、まずアプローチの計画を立てて私に見せてください。実装計画を提示した後は停止すること。ユーザーから承認を受けるまでは実装してはいけない。
- 実装前に、確認したファイルを報告すること
- 指示開始前に`rules/common/*.md`を読むこと
- レビューを指示された際は`rules/common/code-review.md`にも従うこと

### テストコード（必須）
- **特に指示がなくても、新規作成ファイルごとにテストコードを作成する**
- テスト詳細ルール：`specification/coding.md` を必ず実装前に読むこと

### コーディング規約（必読）
実装前に必ず以下を読むこと：
- `specification/coding.md` — 命名規則・テストルール・ディレクトリ構成
- `rules/common/coding-style.md` — 共通ルール
- `rules/typescript/*.md` — Typescript固有ルール
- `rules/gas/*.md` - Google Apps Script固有ルール

## アプリ仕様

- アプリケーションの仕様については `/specification`を読むこと
- `/rules` の内容と重複する場合は `/specification` の内容を優先すること