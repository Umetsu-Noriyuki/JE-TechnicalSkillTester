export interface CategoryScore {
  categoryName: string;
  /** 出題数（選択式＋記述式）。 */
  questionCount: number;
  /** 得点合計（各問題0〜100点の合計、10-3章）。 */
  totalScore: number;
  /** 0〜100（totalScore ÷ questionCount を四捨五入、10-3章）。 */
  correctRate: number;
  /** 記述式の提出数（参考値、10-4章）。 */
  descriptiveSubmittedCount: number;
}

export interface ScoringResult {
  /** 0〜100（10-3章） */
  overallCorrectRate: number;
  /** 出題総数（選択式＋記述式）。 */
  questionCount: number;
  /** 得点合計。 */
  totalScore: number;
  categoryScores: readonly CategoryScore[];
}
