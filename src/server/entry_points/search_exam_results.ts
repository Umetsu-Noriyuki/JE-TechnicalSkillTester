import { VIEWER_ACCESS_KEY_INVALID_ERROR_MESSAGE } from '../../shared/constants';
import type { ExamResultSearchFilter, ExamResultSummary } from '../../shared/types/exam_result_search';
import { filterExamResultRows } from '../domain/services/exam_result_search';
import type { ParsedExamResultRow } from '../domain/models/exam_result_row';
import { findAllExamResultRows } from '../repositories/exam_result_query_repository';
import { isAccessKeyValid } from '../repositories/viewer_log_repository';

const toSummary = (row: ParsedExamResultRow): ExamResultSummary => ({
  rowNumber: row.rowNumber,
  recordedAt: row.recordedAt.toISOString(),
  roleLabel: row.roleLabel,
  name: row.name,
  employeeNumber: row.employeeNumber,
  department: row.department,
  overallCorrectRate: row.overallCorrectRate,
});

/**
 * 閲覧画面の「検索開始」ボタン押下時に google.script.run から呼び出される（15章）。
 * Access Keyは呼び出しのたびにサーバー側で再検証する（クライアントの画面状態を信用しない、
 * 6-3章の受験許可チェックと同じ考え方）。不一致の場合は問題マスタ等と同様、
 * 「受験結果」シートへは一切アクセスせず例外を投げる。
 */
export const searchExamResults = (accessKey: string, filter: ExamResultSearchFilter): ExamResultSummary[] => {
  if (!isAccessKeyValid(accessKey)) {
    throw new Error(VIEWER_ACCESS_KEY_INVALID_ERROR_MESSAGE);
  }

  const rows = findAllExamResultRows();
  return filterExamResultRows(rows, filter).map(toSummary);
};
