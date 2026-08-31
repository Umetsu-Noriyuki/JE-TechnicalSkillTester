export interface CategoryScore {
  categoryName: string;
  choiceQuestionCount: number;
  choiceCorrectCount: number;
  /** 0〜100（10-3章） */
  correctRate: number;
  descriptiveSubmittedCount: number;
}

export interface ScoringResult {
  /** 0〜100（10-3章） */
  overallCorrectRate: number;
  choiceQuestionCount: number;
  choiceCorrectCount: number;
  categoryScores: readonly CategoryScore[];
}
