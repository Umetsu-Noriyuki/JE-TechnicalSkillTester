import type { CategoryScore, ScoringResult } from '../../../shared/types/scoring_result';
import type { QuestionAnswer } from '../models/answer_payload';
import type { Question } from '../models/question';

const roundPercentage = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);

interface CategoryAccumulator {
  categoryName: string;
  choiceQuestionCount: number;
  choiceCorrectCount: number;
  descriptiveSubmittedCount: number;
}

const createAccumulator = (categoryName: string): CategoryAccumulator => ({
  categoryName,
  choiceQuestionCount: 0,
  choiceCorrectCount: 0,
  descriptiveSubmittedCount: 0,
});

/**
 * 送信された回答と、出題された問題データ（正解情報を含む）を突き合わせて採点する（10章）。
 * 選択式のみを自動採点の対象とし（10-2章）、記述式は提出の有無のみを集計する。
 * administeredQuestions に存在しない questionId の回答は無視する。
 */
export const scoreExam = (
  administeredQuestions: readonly Question[],
  answers: readonly QuestionAnswer[],
): ScoringResult => {
  const questionById = new Map(administeredQuestions.map((question) => [question.id, question]));
  const categories = new Map<string, CategoryAccumulator>();

  let overallChoiceQuestionCount = 0;
  let overallChoiceCorrectCount = 0;

  for (const answer of answers) {
    const question = questionById.get(answer.questionId);
    if (question === undefined) {
      continue;
    }

    const accumulator = categories.get(question.category) ?? createAccumulator(question.category);

    if (question.format === 'choice') {
      accumulator.choiceQuestionCount += 1;
      overallChoiceQuestionCount += 1;
      if (answer.selectedChoiceNumber !== undefined && answer.selectedChoiceNumber === question.correctChoiceNumber) {
        accumulator.choiceCorrectCount += 1;
        overallChoiceCorrectCount += 1;
      }
    } else if (answer.descriptiveAnswer !== undefined && answer.descriptiveAnswer.trim() !== '') {
      accumulator.descriptiveSubmittedCount += 1;
    }

    categories.set(question.category, accumulator);
  }

  const categoryScores: CategoryScore[] = [...categories.values()].map((accumulator) => ({
    categoryName: accumulator.categoryName,
    choiceQuestionCount: accumulator.choiceQuestionCount,
    choiceCorrectCount: accumulator.choiceCorrectCount,
    correctRate: roundPercentage(accumulator.choiceCorrectCount, accumulator.choiceQuestionCount),
    descriptiveSubmittedCount: accumulator.descriptiveSubmittedCount,
  }));

  return {
    overallCorrectRate: roundPercentage(overallChoiceCorrectCount, overallChoiceQuestionCount),
    choiceQuestionCount: overallChoiceQuestionCount,
    choiceCorrectCount: overallChoiceCorrectCount,
    categoryScores,
  };
};
