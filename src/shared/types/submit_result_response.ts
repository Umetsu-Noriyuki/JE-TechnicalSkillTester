import type { ScoringResult } from './scoring_result';

/**
 * submitResult(payload) の戻り値（10-1章）。
 * 選択式の採点・記述式の提出状況のみを集計した暫定の採点結果と、
 * 記述式のバックグラウンド採点・ポーリングに使う resultId を返す。
 */
export interface SubmitResultResponse {
  /** 「受験結果」シートに追記した行番号。記述式採点の対象行を特定するためのキー。 */
  resultId: number;
  /** 選択式のみを集計した暫定の採点結果（記述式が完了すると最終値に置き換わる、10-3章）。 */
  scoringResult: ScoringResult;
}
