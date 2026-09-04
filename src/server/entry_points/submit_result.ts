import { ROLE_LABELS } from '../../shared/constants';
import type { AnswerPayload } from '../../shared/types/answer_payload';
import { isExamineeRole } from '../../shared/types/examinee_role';
import type { ScoringResult } from '../../shared/types/scoring_result';
import { buildAnswerDetails } from '../domain/services/answer_detail_builder';
import { scoreExam } from '../domain/services/scorer';
import type { ExamResultRecord } from '../domain/models/exam_result_record';
import { findAllQuestions } from '../repositories/question_repository';
import { appendExamResult } from '../repositories/result_repository';

/**
 * 「採点」／「回答終了」ボタン押下時に google.script.run から呼び出される（9-4章）。
 * 問題マスタと突き合わせて採点・回答詳細の記録まで行い、採点結果をクライアントへ返す
 * （画面に表示するかどうかは受験者区分に応じてクライアント側で判断する、10-4章）。
 */
export const submitResult = (payload: AnswerPayload): ScoringResult => {
  if (!isExamineeRole(payload.examinee.role)) {
    throw new Error(`不正な受験者区分です: ${String(payload.examinee.role)}`);
  }

  const allQuestions = findAllQuestions();
  const scoringResult = scoreExam(allQuestions, payload.answers);
  const answerDetails = buildAnswerDetails(allQuestions, payload.answers);

  const record: ExamResultRecord = {
    recordedAt: new Date(),
    roleLabel: ROLE_LABELS[payload.examinee.role],
    name: payload.examinee.name,
    employeeNumber: payload.examinee.employeeNumber ?? '',
    department: payload.examinee.department ?? '',
    overallCorrectRate: scoringResult.overallCorrectRate,
    categoryScores: scoringResult.categoryScores,
    elapsedSeconds: payload.elapsedSeconds,
    isTimedOut: payload.isTimedOut,
    answerDetailsJson: JSON.stringify(answerDetails),
  };

  appendExamResult(record);

  return scoringResult;
};
