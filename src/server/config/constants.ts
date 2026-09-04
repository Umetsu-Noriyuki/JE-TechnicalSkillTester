/** 「問題マスタ」「受験結果」スプレッドシート内の各シート（タブ）名（3-1章）。 */
export const SHEET_NAMES = {
  questionMaster: '問題マスタ',
  examResult: '受験結果',
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
export const GEMINI_MODEL = 'gemini-2.5-flash';

/** Gemini API（generateContent）のベースURL。末尾に `/{model}:generateContent?key=...` を付与して使用する。 */
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
