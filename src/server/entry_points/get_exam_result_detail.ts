import { VIEWER_ACCESS_KEY_INVALID_ERROR_MESSAGE } from '../../shared/constants';
import type { ExamResultDetail } from '../../shared/types/exam_result_detail';
import { aggregateScores, type QuestionScoreEntry } from '../domain/services/scorer';
import { findExamResultRowByRowNumber } from '../repositories/exam_result_query_repository';
import { isAccessKeyValid } from '../repositories/viewer_log_repository';

/**
 * 閲覧画面の検索結果一覧から1件選択した際に google.script.run から呼び出される（15章）。
 * Access Keyは searchExamResults と同様、呼び出しのたびにサーバー側で再検証する。
 * 総合正解率・区分別正解率は、G〜K列（表示用の整形済み文字列）ではなく、
 * M列（回答詳細JSON）から aggregateScores で再集計する（唯一の正とするため）。
 */
export const getExamResultDetail = (accessKey: string, rowNumber: number): ExamResultDetail => {
  if (!isAccessKeyValid(accessKey)) {
    throw new Error(VIEWER_ACCESS_KEY_INVALID_ERROR_MESSAGE);
  }

  const row = findExamResultRowByRowNumber(rowNumber);
  if (row === null) {
    throw new Error(`受験結果が見つかりません（行番号: ${rowNumber}）`);
  }

  const scoreEntries: QuestionScoreEntry[] = row.answerDetails.map((detail) => ({
    category: detail.category,
    score: detail.score,
    isDescriptiveSubmitted: detail.format === 'text' ? detail.answerContent.trim() !== '' : undefined,
  }));
  const aggregated = aggregateScores(scoreEntries);

  return {
    rowNumber: row.rowNumber,
    recordedAt: row.recordedAt.toISOString(),
    roleLabel: row.roleLabel,
    name: row.name,
    employeeNumber: row.employeeNumber,
    department: row.department,
    overallCorrectRate: aggregated.overallCorrectRate,
    durationText: row.durationText,
    categoryScores: aggregated.categoryScores,
    totalScore: aggregated.totalScore,
    questionCount: aggregated.questionCount,
    answerDetails: row.answerDetails,
  };
};
