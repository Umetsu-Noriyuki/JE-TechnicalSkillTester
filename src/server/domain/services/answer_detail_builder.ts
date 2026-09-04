import type { QuestionAnswer } from '../../../shared/types/answer_payload';
import type { Question, QuestionFormat } from '../models/question';

export interface AnswerDetail {
  questionId: string;
  category: string;
  subCategory: string;
  format: QuestionFormat;
  /** 選択式：選択した選択肢の文言（未回答なら空文字）／記述式：入力内容 */
  answerContent: string;
  /** 0〜100（10-2章）。選択式：正解100点/不正解0点、記述式：Gemini採点結果。 */
  score: number;
  /** 選択式のみ。 */
  isCorrect?: boolean;
  /** 記述式のみ。 */
  modelAnswer?: string;
  /** 記述式のみ。Geminiによる採点フィードバック。 */
  feedback?: string;
}

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
