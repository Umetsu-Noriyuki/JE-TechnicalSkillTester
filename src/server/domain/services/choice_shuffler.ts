import type { QuizChoice, QuizQuestion } from '../../../shared/types/quiz_question';
import type { Question } from '../models/question';
import { shuffle } from './shuffle';

/**
 * サーバー内部のQuestionを、クライアントへ返却するQuizQuestionへ変換する（8章）。
 * 選択式の場合、選択肢の表示順をシャッフルしつつ、各選択肢に元の番号(choiceNumber)を
 * 保持させる。正誤判定はこのchoiceNumberを用いて行うため、表示順を入れ替えても
 * 採点結果に影響しない。
 */
export const toQuizQuestion = (question: Question): QuizQuestion => {
  if (question.format === 'text') {
    return { id: question.id, format: 'text', text: question.text };
  }

  const choices: QuizChoice[] = (question.choices ?? []).map((text, index) => ({
    choiceNumber: index + 1,
    text,
  }));

  return {
    id: question.id,
    format: 'choice',
    text: question.text,
    choices: shuffle(choices),
  };
};
