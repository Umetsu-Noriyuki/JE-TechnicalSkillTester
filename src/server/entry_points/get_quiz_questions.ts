import { isExamineeRole } from '../../shared/types/examinee_role';
import type { QuizQuestion } from '../../shared/types/quiz_question';
import { toQuizQuestion } from '../domain/services/choice_shuffler';
import { selectExamQuestions } from '../domain/services/question_selector';
import { findAllQuestions } from '../repositories/question_repository';

/**
 * 開始画面の「テスト開始」ボタン押下時に google.script.run から呼び出される（6-3章）。
 * 「問題マスタ」から出題ロジック（7章）に従い問題を抽出し、選択肢をシャッフルしたうえで
 * クライアントへ返却する。
 */
export const getQuizQuestions = (role: string): QuizQuestion[] => {
  if (!isExamineeRole(role)) {
    throw new Error(`不正な受験者区分です: ${role}`);
  }

  const allQuestions = findAllQuestions();
  const selectedQuestions = selectExamQuestions(allQuestions);
  return selectedQuestions.map((question) => toQuizQuestion(question));
};
