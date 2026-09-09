import { PERMISSION_DENIED_ERROR_MESSAGE } from '../../shared/constants';
import { isExamineeRole } from '../../shared/types/examinee_role';
import type { QuizQuestion } from '../../shared/types/quiz_question';
import { toQuizQuestion } from '../domain/services/choice_shuffler';
import { isNameAllowed } from '../domain/services/examinee_permission_checker';
import { selectExamQuestions } from '../domain/services/question_selector';
import { findAllowedExamineeNames } from '../repositories/permission_repository';
import { findAllQuestions } from '../repositories/question_repository';

/**
 * 開始画面の「テスト開始」ボタン押下時に google.script.run から呼び出される（6-4章）。
 * 入社希望者のみ受験許可チェック（6-3章）を行い、許可されない場合は問題マスタへ一切
 * アクセスせず PERMISSION_DENIED_ERROR_MESSAGE を投げる。
 * 許可された場合（または社員区分の場合）は「問題マスタ」から出題ロジック（7章）に従い
 * 問題を抽出し、選択肢をシャッフルしたうえでクライアントへ返却する。
 */
export const getQuizQuestions = (role: string, name: string): QuizQuestion[] => {
  if (!isExamineeRole(role)) {
    throw new Error(`不正な受験者区分です: ${role}`);
  }

  if (role === 'applicant' && !isNameAllowed(name, findAllowedExamineeNames())) {
    throw new Error(PERMISSION_DENIED_ERROR_MESSAGE);
  }

  const allQuestions = findAllQuestions();
  const selectedQuestions = selectExamQuestions(allQuestions);
  return selectedQuestions.map((question) => toQuizQuestion(question));
};
