/** 「問題マスタ」「受験結果」スプレッドシート内の各シート（タブ）名（3-1章）。 */
export const SHEET_NAMES = {
  questionMaster: '問題マスタ',
  examResult: '受験結果',
} as const;

/** スプレッドシート書き込み時のロック最大待機時間（ミリ秒）（11-3章）。 */
export const LOCK_WAIT_MILLISECONDS = 30000;
