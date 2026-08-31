import type { QuestionAnswer } from '../../../shared/types/answer_payload';
import type { Question, QuestionFormat } from '../models/question';

export interface AnswerDetail {
  questionId: string;
  category: string;
  subCategory: string;
  format: QuestionFormat;
  /** 選択式：選択した選択肢の文言（未回答なら空文字）／記述式：入力内容 */
  answerContent: string;
  /** 選択式のみ。 */
  isCorrect?: boolean;
  /** 記述式のみ。 */
  modelAnswer?: string;
}

/**
 * 「受験結果」シートM列に格納する、各設問の回答詳細を生成する（11-2章）。
 * questions に存在しない questionId の回答は無視する。
 */
export const buildAnswerDetails = (
  questions: readonly Question[],
  answers: readonly QuestionAnswer[],
): AnswerDetail[] => {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const details: AnswerDetail[] = [];

  for (const answer of answers) {
    const question = questionById.get(answer.questionId);
    if (question === undefined) {
      continue;
    }

    if (question.format === 'choice') {
      const selectedText =
        answer.selectedChoiceNumber !== undefined
          ? (question.choices?.[answer.selectedChoiceNumber - 1] ?? '')
          : '';
      details.push({
        questionId: question.id,
        category: question.category,
        subCategory: question.subCategory,
        format: 'choice',
        answerContent: selectedText,
        isCorrect:
          answer.selectedChoiceNumber !== undefined && answer.selectedChoiceNumber === question.correctChoiceNumber,
      });
    } else {
      details.push({
        questionId: question.id,
        category: question.category,
        subCategory: question.subCategory,
        format: 'text',
        answerContent: answer.descriptiveAnswer ?? '',
        modelAnswer: question.modelAnswer,
      });
    }
  }

  return details;
};
