/** 「問題マスタ」「受験結果」「受験許可」スプレッドシート内の各シート（タブ）名（3-1章）。 */
export const SHEET_NAMES = {
  questionMaster: '問題マスタ',
  examResult: '受験結果',
  examPermission: '受験許可',
  viewerLog: '閲覧ログ',
} as const;

/** スプレッドシート書き込み時のロック最大待機時間（ミリ秒）（11-3章）。 */
export const LOCK_WAIT_MILLISECONDS = 30000;

/**
 * 「受験結果」シートの区分別正解率列（G〜K列）の並び順（11-2章）。
 * 出題ロジック（question_selector等）は区分名をハードコードせずデータ駆動で扱うが、
 * この列の並びだけはスプレッドシートの固定スキーマとして順序を固定する必要があるため、
 * ここでのみ区分名を列挙する。
 */
export const CATEGORY_NAMES = ['コーディング', 'SQL', 'プログラミング技法', 'ロジカルシンキング', '行動指針'] as const;

/** 記述式の採点（10-2章）に使用するGeminiのモデル名。実装時点の選定であり、変更容易な定数として分離する。 */
export const GEMINI_MODEL = 'gemini-3.6-flash';

/** Gemini API（generateContent）のベースURL。末尾に `/{model}:generateContent?key=...` を付与して使用する。 */
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * 記述式7問をまとめた1回のGemini呼び出しが失敗した場合の最大再試行回数（10-2章）。
 * 初回呼び出しを含めると最大 GEMINI_MAX_RETRY_COUNT + 1 回試行する。
 */
export const GEMINI_MAX_RETRY_COUNT = 3;

/** Gemini呼び出し失敗時、再試行までの待機時間（ミリ秒）。429（レート制限超過）・503（過負荷）を想定。 */
export const GEMINI_RETRY_DELAY_MILLISECONDS = 30000;

/** 閲覧画面（15章）へのアクセスを許可するGoogleアカウントのドメイン。 */
export const VIEWER_ALLOWED_EMAIL_DOMAIN = '@jinearth.co.jp';

/** 「閲覧ログ」シートのB1セルに設定されたAccess Keyを比較する対象セル位置（1始まり）。 */
export const VIEWER_ACCESS_KEY_CELL = { row: 1, column: 2 } as const;

/** 「閲覧ログ」シートで、実際のログ記録が始まる行（1〜3行目はAccess Key設定・見出し等に使う、15章）。 */
export const VIEWER_LOG_START_ROW = 4;

/** 「受験結果」シートの先頭データ行（1行目はヘッダー行、11-2章）。 */
export const EXAM_RESULT_START_ROW = 2;

/** 「受験結果」シートに設ける記述式採点列（N〜T列）の固定列数（11-2章）。 */
export const DESCRIPTIVE_SCORE_SLOT_COUNT = 7;

/** 記述式採点列（N〜T列）に、バックグラウンド採点が完了するまでの間だけ書き込む仮の値。 */
export const DESCRIPTIVE_SCORING_PENDING_MARKER = '採点中';
