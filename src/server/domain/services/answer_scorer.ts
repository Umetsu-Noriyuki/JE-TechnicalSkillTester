import type { QuestionAnswer } from '../../../shared/types/answer_payload';
import type { Question } from '../models/question';

export interface QuestionAnswerPair {
  question: Question;
  answer: QuestionAnswer;
}

/**
 * 送信された回答（payload.answers）を問題マスタと突き合わせ、対応する組にする。
 * submit_result.ts（即時の選択式採点）と score_descriptive_questions.ts／
 * get_descriptive_scoring_result.ts（バックグラウンド採点・最終結果取得）の両方で
 * 同じ突き合わせロジックを使うことで、実行タイミングが分かれても対応順序がずれないようにする。
 * 問題マスタに存在しないquestionIdの回答は無視する。
 */
export const buildQuestionAnswerPairs = (
  allQuestions: readonly Question[],
  answers: readonly QuestionAnswer[],
): QuestionAnswerPair[] => {
  const questionById = new Map(allQuestions.map((question) => [question.id, question]));

  const pairs: QuestionAnswerPair[] = [];
  for (const answer of answers) {
    const question = questionById.get(answer.questionId);
    if (question !== undefined) {
      pairs.push({ question, answer });
    }
  }
  return pairs;
};
