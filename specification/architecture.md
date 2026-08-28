# ディレクトリ構成仕様（`src/` 以下）

- 対象：`JE-TechnicalSkillTester-spec.md`（v2.0）の実装
- 前提：TypeScript → Rollup → clasp という既存トランスパイル／デプロイ方式（`package.json`, `rollup.config.mjs`, `tsconfig.json` 参照）
- 本ドキュメントは `specification/coding.md` 106行目「ディレクトリ構成は `specification/architecture.md` に従うこと」に基づく正となる構成定義である。

---

## 1. 設計方針

1. **サーバー / クライアントの明確な分離**（CLAUDE.md 必須要件）
   `src/server/`（GASサーバーサイド）と `src/client/`（HtmlServiceで配信するHTML・クライアントJS）をトップレベルで分離する。
2. **レイヤードアーキテクチャ**
   `entry_points`（公開関数）→ `domain`（ドメインロジック）→ `repositories`（データアクセス）→ `infrastructure`（GAS組み込みAPIのラッパー）の一方向依存とする。上位層は下位層に依存してよいが、逆方向の依存は禁止。
3. **Repository パターン**（`rules/common/patterns.md`）
   スプレッドシートへの読み書きは `repositories/` に隔離し、ドメインロジック（抽出・採点等）はスプレッドシートを直接触らない。これにより `question_selector.ts` や `scorer.ts` はGAS実行環境なしでも純粋関数として単体テスト可能になる。
4. **秘匿情報・環境依存値の分離**（`rules/gas/implementation.md`）
   スプレッドシートIDなどはコードにハードコードせず、`PropertiesService` 経由で取得する薄いラッパー（`infrastructure/script_properties_client.ts`）を介す。
5. **命名規則**（`specification/coding.md`）
   ファイル名・フォルダ名は snake_case、変数・関数は lowerCamelCase、型・クラスは PascalCase。テストは対象ファイルと同階層の `__tests__/` に `xxx.test.ts` として配置する。

---

## 2. ディレクトリツリー

```
src/
├── appsscript.json                     # GASマニフェスト（package.jsonのcopy-appsscriptでdist直下へコピー）
├── index.ts                            # サーバーエントリーポイント：GASグローバル関数へのバインドのみを行う
│
├── server/                             # バックエンド（GASサーバーサイド、.gs相当）
│   ├── entry_points/                   # doGet / google.script.run から直接呼ばれる公開関数
│   │   ├── __tests__/
│   │   │   ├── do_get.test.ts
│   │   │   ├── get_quiz_questions.test.ts
│   │   │   └── submit_result.test.ts
│   │   ├── do_get.ts                   # doGet(e)：roleパラメータ検証・HTML出力（3-4, 4-1章）
│   │   ├── get_quiz_questions.ts       # getQuizQuestions(role)：出題（6-3, 7章）
│   │   └── submit_result.ts            # submitResult(payload)：採点・記録（10章, 11章）
│   │
│   ├── domain/                         # ドメインロジック（GAS APIに依存しない純粋関数群）
│   │   ├── models/
│   │   │   ├── __tests__/
│   │   │   ├── question.ts             # Question（問題マスタ1行分の内部表現、正解情報を含む）
│   │   │   ├── answer_payload.ts       # submitResultが受け取る回答データの型（10-1章）
│   │   │   └── exam_result_record.ts   # 「受験結果」シート1行分の型（11-2章）
│   │   │
│   │   └── services/
│   │       ├── __tests__/
│   │       │   ├── question_selector.test.ts
│   │       │   ├── choice_shuffler.test.ts
│   │       │   └── scorer.test.ts
│   │       ├── question_selector.ts    # 区分別抽出・記述式按分ロジック（7-2, 7-3, 7-4章）
│   │       ├── choice_shuffler.ts      # 選択肢シャッフルと正誤対応の保持（8章）
│   │       └── scorer.ts               # 採点・正解率算出（10-2, 10-3章）
│   │
│   ├── repositories/                   # スプレッドシートアクセス（Repositoryパターン）
│   │   ├── __tests__/
│   │   │   ├── question_repository.test.ts
│   │   │   └── result_repository.test.ts
│   │   ├── question_repository.ts      # 「問題マスタ」シートの読み取り（7-1章）
│   │   └── result_repository.ts        # 「受験結果」シートへの追記（11章、LockService利用）
│   │
│   ├── infrastructure/                 # GAS組み込みAPIの薄いラッパー（テスト容易性のため分離）
│   │   ├── __tests__/
│   │   │   ├── spreadsheet_client.test.ts
│   │   │   ├── lock_service_client.test.ts
│   │   │   └── script_properties_client.test.ts
│   │   ├── spreadsheet_client.ts       # SpreadsheetApp.openById等のラッパー
│   │   ├── lock_service_client.ts      # LockService.getScriptLock()のラッパー（11-3章）
│   │   └── script_properties_client.ts # PropertiesServiceラッパー（SHEET_ID等の機密/環境値取得）
│   │
│   └── config/
│       ├── __tests__/
│       │   └── constants.test.ts
│       └── constants.ts                # シート名・LOCK待機時間等、サーバー内部専用の定数
│
├── client/                             # フロントエンド（HtmlServiceで配信するHTML／クライアントJS）
│   ├── views/                          # HTMLテンプレート本体
│   │   ├── index.html                  # doGetが返すメインテンプレート（<?!= include(...) ?>で下記partialsを読込）
│   │   └── partials/
│   │       ├── style.html              # 共通CSS
│   │       ├── error_screen.html       # アクセス方法エラー画面（4-1章）
│   │       ├── start_screen.html       # 開始画面（6章）
│   │       ├── quiz_screen.html        # 受験画面（5章, 9章）
│   │       ├── result_screen.html      # 結果画面（社員のみ表示, 10-4章）
│   │       ├── finish_screen.html      # 終了画面（入社希望者向け, 10-4章）
│   │       └── script.html             # クライアントサイドJSの読込用（下記scriptsの内容を反映）
│   │
│   └── scripts/                        # クライアントサイドロジック（TypeScript、単体テスト対象）
│       ├── __tests__/
│       │   ├── timer.test.ts
│       │   ├── api_client.test.ts
│       │   └── quiz_view_controller.test.ts
│       ├── timer.ts                    # 経過時間表示・残り時間閾値判定（9-2, 9-3章）
│       ├── api_client.ts               # google.script.run のPromiseラッパー
│       └── quiz_view_controller.ts     # 画面遷移・入力チェック・時間切れ時の操作無効化（6章, 9-3, 9-4章）
│
└── shared/                             # サーバー・クライアント双方が参照する型・定数（APIの契約）
    ├── __tests__/
    │   └── constants.test.ts
    ├── types/
    │   ├── examinee_role.ts            # ExamineeRole = 'applicant' | 'newhire' | 'junior'（4章）
    │   ├── quiz_question.ts            # クライアントに返す出題データの型（正解情報を含まない）
    │   └── scoring_result.ts           # クライアントに返す採点結果の型（10-4章）
    └── constants.ts                    # EXAM_DURATION_SEC, TOTAL_QUESTION_COUNT, CATEGORY_QUOTA等
```

---

## 3. 各ディレクトリの役割

| ディレクトリ | 役割 | 依存してよい範囲 |
|---|---|---|
| `server/entry_points` | GASが直接呼び出す公開関数の受け口。入出力の変換とオーケストレーションに専念し、業務ロジック自体は持たない | `domain`, `repositories`, `shared` |
| `server/domain/models` | サーバー内部で使う型定義（クライアントに渡さない情報を含む） | なし（型のみ） |
| `server/domain/services` | 抽出・シャッフル・採点などの業務ロジック。GAS APIに一切依存しない純粋関数とする | `domain/models`, `shared` |
| `server/repositories` | スプレッドシートに対するCRUD相当の操作をカプセル化 | `infrastructure`, `domain/models` |
| `server/infrastructure` | `SpreadsheetApp` / `LockService` / `PropertiesService` など、GAS組み込みAPIの薄いラッパー | GAS組み込みAPIのみ |
| `server/config` | サーバー内部専用の定数（シート名など） | なし |
| `client/views` | `HtmlService` が配信するHTMLテンプレート一式 | `client/scripts`（生成物経由） |
| `client/scripts` | クライアント側の表示制御・タイマー・`google.script.run` 呼び出しロジック | `shared` |
| `shared` | サーバー・クライアント間でやり取りするデータの型と、両者が参照する定数（単一の真実源） | なし |

---

## 4. 命名・テスト配置ルール（`specification/coding.md` 準拠の再掲）

- ファイル名・フォルダ名：snake_case（例：`question_selector.ts`, `entry_points/`）
- 変数・関数：lowerCamelCase、型・インターフェース：PascalCase、定数：`UPPER_SNAKE_CASE`
- テストコードは対象ファイルと同一ディレクトリ内の `__tests__/` に配置し、ファイル名は `対象ファイル名.test.ts`
- **型定義のみをexportするファイル**（`shared/types/*.ts`, `server/domain/models/*.ts` 等）は実行時ロジックを持たないため、`__tests__` を省略してよい。実行時ロジックを1つでも含むファイルは必ずテストコードを作成する
- テストの `test()` の説明文は日本語、正常系・異常系が区別できる内容にする

---

## 5. ビルド・デプロイ構成との対応

`rollup.config.mjs` は設定済みで、`npm run build` により以下がすべて自動化されている（`src/` 配下の最小スタブで動作確認済み）。

### 5-1. サーバー側バンドル

- Rollupは `src/index.ts` を入力として `dist/index.js` を **`iife`形式** で単一ファイル出力する（`rollup.config.mjs` の `serverConfig`）。GAS実行環境（V8ランタイム）はトップレベルの `import`/`export` 構文を解釈できないため、`esm` ではなく `iife` を採用している
- `index.ts` は各 `entry_points` 配下の関数をimportし、`globalThis` へバインドする役割のみを持つ

  ```typescript
  // src/index.ts
  import { doGet } from './server/entry_points/do_get';
  import { include } from './server/entry_points/include';

  (globalThis as Record<string, unknown>).doGet = doGet;
  (globalThis as Record<string, unknown>).include = include;
  ```

  `getQuizQuestions` / `submitResult` 等、以降追加する公開関数も同様に `index.ts` でバインドする
- ソース側は `server/entry_points/*.ts` のように複数ファイルに分割しているが、Rollupが単一ファイルへ束ねるため、GAS上には `dist/index.js` 1ファイルとしてデプロイされる（GASエディタ上でファイルがスラッシュ区切りの疑似フォルダ名になるわけではない）
- `src/appsscript.json` は `copy-appsscript` npmスクリプト（`copyfiles -f src/appsscript.json dist`）で `dist/appsscript.json` にコピーされる。マニフェストはGAS上で必ずプロジェクト直下に存在する必要があるため、`src/` 直下から動かさないこと

### 5-2. クライアント側バンドルとHTMLへの埋め込み

GASの `HtmlService` は独立した静的 `.js` ファイルを配信できない（ルート直下に置かれた `.js` はサーバースクリプトとして扱われてしまう）ため、クライアントコードは最終的にHTML内の `<script>` タグへ埋め込む必要がある。これを次の3工程で自動化している。

1. **クライアントバンドル**（`rollup.config.mjs` の `clientConfig`）：`src/client/scripts/index.ts` を入力に、`dist/client/scripts/bundle.js` を `iife`形式で出力する
2. **`copy-views`**（`copyfiles -u 3 "src/client/views/**/*.html" dist/client/views`）：`src/client/views/**/*.html` をそのまま `dist/client/views/` にコピーする。`src/client/views/partials/script.html` にはプレースホルダー `<!-- CLIENT_SCRIPT -->` のみを置き、生成物をソース側に混在させない
3. **`inline-client-script`**（`scripts/build/inline-client-script.mjs`）：`dist/client/scripts/bundle.js` の内容を読み込み、`dist/client/views/partials/script.html` のプレースホルダーを `<script>...</script>` に置き換えたうえで、不要になった `dist/client/scripts/` を削除する

- `src/client/scripts/*.ts` のうち、DOM操作を伴うエントリーポイント（`index.ts`）は薄いブートストラップに留め、テスト対象のロジック（`welcome_message.ts` 等）は別ファイルに分離してVitestで純粋関数として検証する方針とする（`document` 等のブラウザAPIはテスト実行環境であるNode上に存在しないため）

### 5-3. build スクリプトの実行順序

```
lint → test → clean → bundle（server + client） → copy-appsscript → copy-views → inline-client-script
```

### 5-4. clasp / デプロイ

- `.clasp.json` の `rootDir` は `dist` とする。`dist/index.js`・`dist/appsscript.json`・`dist/client/views/**/*.html` が最終的にプッシュされる成果物一式となる
- `.clasp.json` は `scriptId` を含むため Git 管理対象外とし（`.gitignore` で除外）、代わりにプレースホルダー入りの `.clasp.json.example` をリポジトリにコミットする。開発者は各自 `.clasp.json.example` をコピーして `.clasp.json` を作成し、自分の `scriptId` を設定する
- `.clasp.json` 自体の作成・編集は `rules/gas/implementation.md` の方針によりエージェントが直接行わない。ユーザー側で用意すること

---

## 6. テスト目標カバレッジ（`specification/coding.md` 対応表）

| ディレクトリ | 分類 | 目標カバレッジ |
|---|---|---|
| `server/domain/services` | ビジネスロジック／重要な計算 | 90〜95%以上 |
| `server/repositories` | DBアクセス（外部API連携相当） | 70〜80% |
| `server/entry_points` | Controller/Handler | 70〜80% |
| `server/infrastructure` | 設定・Glue Code | 50〜70% |
| `client/scripts` | UI・フレームワーク依存コード | 60〜80% |
