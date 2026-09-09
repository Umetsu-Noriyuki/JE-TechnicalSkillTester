import type { CategoryScore, ScoringResult } from '../../../shared/types/scoring_result';

export interface QuestionScoreEntry {
  category: string;
  /** 0〜100（選択式：正解100点/不正解0点、記述式：Gemini採点結果） */
  score: number;
  /** 記述式で、かつ回答が提出されているか（10-4章の参考値集計用）。選択式では指定しない。 */
  isDescriptiveSubmitted?: boolean;
}

const roundRate = (totalScore: number, questionCount: number): number =>
  questionCount === 0 ? 0 : Math.round(totalScore / questionCount);

interface CategoryAccumulator {
  categoryName: string;
  questionCount: number;
  totalScore: number;
  descriptiveSubmittedCount: number;
}

/**
 * 選択式・記述式それぞれの得点（0〜100点、10-2章）から、総合・区分別の正解率を集計する純粋関数（10-3章）。
 * Gemini採点などの副作用を伴う処理は呼び出し側（submit_result.ts）で完了させ、
 * その結果の得点のみをこの関数に渡すこと。
 */
export const aggregateScores = (entries: readonly QuestionScoreEntry[]): ScoringResult => {
  const categories = new Map<string, CategoryAccumulator>();
  let overallQuestionCount = 0;
  let overallTotalScore = 0;

  for (const entry of entries) {
    const accumulator = categories.get(entry.category) ?? {
      categoryName: entry.category,
      questionCount: 0,
      totalScore: 0,
      descriptiveSubmittedCount: 0,
    };

    accumulator.questionCount += 1;
    accumulator.totalScore += entry.score;
    if (entry.isDescriptiveSubmitted === true) {
      accumulator.descriptiveSubmittedCount += 1;
    }
    categories.set(entry.category, accumulator);

    overallQuestionCount += 1;
    overallTotalScore += entry.score;
  }

  const categoryScores: CategoryScore[] = [...categories.values()].map((accumulator) => ({
    categoryName: accumulator.categoryName,
    questionCount: accumulator.questionCount,
    totalScore: accumulator.totalScore,
    correctRate: roundRate(accumulator.totalScore, accumulator.questionCount),
    descriptiveSubmittedCount: accumulator.descriptiveSubmittedCount,
  }));

  return {
    overallCorrectRate: roundRate(overallTotalScore, overallQuestionCount),
    questionCount: overallQuestionCount,
    totalScore: overallTotalScore,
    categoryScores,
  };
};

/** 選択式問題を採点する（10-2章）。正解番号と一致すれば100点、不一致・未回答なら0点。 */
export const scoreChoiceAnswer = (
  correctChoiceNumber: number | undefined,
  selectedChoiceNumber: number | undefined,
): number => (selectedChoiceNumber !== undefined && selectedChoiceNumber === correctChoiceNumber ? 100 : 0);
