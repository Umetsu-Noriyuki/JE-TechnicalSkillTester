import { ROLE_LABELS } from '../../shared/constants';
import type { AnswerPayload } from '../../shared/types/answer_payload';
import { isExamineeRole } from '../../shared/types/examinee_role';
import type { ScoringResult } from '../../shared/types/scoring_result';
import type { SubmitResultResponse } from '../../shared/types/submit_result_response';
import { buildChoiceAnswerDetail, buildDescriptiveAnswerDetail, type AnswerDetail } from '../domain/services/answer_detail_builder';
import { buildQuestionAnswerPairs } from '../domain/services/answer_scorer';
import { aggregateScores, scoreChoiceAnswer, type QuestionScoreEntry } from '../domain/services/scorer';
import type { DescriptiveScoreCell, ExamResultRecord } from '../domain/models/exam_result_record';
import { findAllQuestions } from '../repositories/question_repository';
import { appendExamResult } from '../repositories/result_repository';

/** 採点待ちであることを示す回答詳細のプレースホルダー。バックグラウンド採点完了後にM列ごと上書きされる（11-2章）。 */
const PENDING_DESCRIPTIVE_FEEDBACK = '採点中';

/**
 * 「採点」／「回答終了」ボタン押下時に google.script.run から呼び出される（9-4章, 10-1章）。
 * 選択式の採点状況と記述式の提出状況のみを集計し、即座にクライアントへ返す高速な処理とする。
 * 記述式問題の採点（Gemini API呼び出し）は行わず、対象問題を「採点中」としてシートへ記録し、
 * 別のエントリーポイント（score_descriptive_questions.ts）でバックグラウンド実行させる（12章：外部API依存対策）。
 */
export const submitResult = (payload: AnswerPayload): SubmitResultResponse => {
  if (!isExamineeRole(payload.examinee.role)) {
    throw new Error(`不正な受験者区分です: ${String(payload.examinee.role)}`);
  }

  const allQuestions = findAllQuestions();
  const pairs = buildQuestionAnswerPairs(allQuestions, payload.answers);

  const choiceScoreEntries: QuestionScoreEntry[] = [];
  const answerDetails: AnswerDetail[] = [];
  const descriptiveScoreCells: DescriptiveScoreCell[] = [];

  for (const { question, answer } of pairs) {
    if (question.format === 'choice') {
      const score = scoreChoiceAnswer(question.correctChoiceNumber, answer.selectedChoiceNumber);
      choiceScoreEntries.push({ category: question.category, score });
      answerDetails.push(buildChoiceAnswerDetail(question, answer, score));
      continue;
    }

    answerDetails.push(buildDescriptiveAnswerDetail(question, answer, 0, PENDING_DESCRIPTIVE_FEEDBACK));
    descriptiveScoreCells.push('pending');
  }

  const provisionalScoringResult: ScoringResult = aggregateScores(choiceScoreEntries);

  const record: ExamResultRecord = {
    recordedAt: new Date(),
    roleLabel: ROLE_LABELS[payload.examinee.role],
    name: payload.examinee.name,
    employeeNumber: payload.examinee.employeeNumber ?? '',
    department: payload.examinee.department ?? '',
    overallCorrectRate: provisionalScoringResult.overallCorrectRate,
    categoryScores: provisionalScoringResult.categoryScores,
    elapsedSeconds: payload.elapsedSeconds,
    isTimedOut: payload.isTimedOut,
    answerDetailsJson: JSON.stringify(answerDetails),
    descriptiveScoreCells,
  };

  const resultId = appendExamResult(record);

  return { resultId, scoringResult: provisionalScoringResult };
};
