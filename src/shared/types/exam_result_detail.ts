import type { AnswerDetail } from './answer_detail';
import type { CategoryScore } from './scoring_result';
import type { ExamResultSummary } from './exam_result_search';

/**
 * 閲覧画面（15章）で選択された1件の受験結果の詳細。M列（回答詳細）から算出した
 * 区分別正解率・各設問の回答詳細を含む、採点結果画面と同等の情報一式。
 */
export interface ExamResultDetail extends ExamResultSummary {
  /** L列の所要時間表示文字列（例：「27分41秒（時間内に終了）」）。そのまま表示に使う。 */
  durationText: string;
  categoryScores: readonly CategoryScore[];
  /** 得点合計（M列から再集計した値、10-3章）。 */
  totalScore: number;
  questionCount: number;
  answerDetails: readonly AnswerDetail[];
}
