import type { AnswerDetail } from '../../../shared/types/answer_detail';
import type { QuestionAnswer } from '../../../shared/types/answer_payload';
import type { Question } from '../models/question';

export type { AnswerDetail };

/** 選択式の回答詳細を作る（11-2章M列）。score は scoreChoiceAnswer の結果を渡すこと。 */
export const buildChoiceAnswerDetail = (question: Question, answer: QuestionAnswer, score: number): AnswerDetail => {
  const selectedText =
    answer.selectedChoiceNumber !== undefined ? (question.choices?.[answer.selectedChoiceNumber - 1] ?? '') : '';

  return {
    questionId: question.id,
    category: question.category,
    subCategory: question.subCategory,
    format: 'choice',
    answerContent: selectedText,
    score,
    isCorrect: score === 100,
  };
};

/** 記述式の回答詳細を作る（11-2章M列）。score・feedback は scoreDescriptiveAnswer の結果を渡すこと。 */
export const buildDescriptiveAnswerDetail = (
  question: Question,
  answer: QuestionAnswer,
  score: number,
  feedback: string,
): AnswerDetail => ({
  questionId: question.id,
  category: question.category,
  subCategory: question.subCategory,
  format: 'text',
  answerContent: answer.descriptiveAnswer ?? '',
  score,
  modelAnswer: question.modelAnswer,
  feedback,
});
