import { VIEWER_ACCESS_KEY_INVALID_ERROR_MESSAGE } from '../../shared/constants';
import type { ExamResultDetail } from '../../shared/types/exam_result_detail';
import { buildExamResultDetail } from '../domain/services/exam_result_detail_builder';
import { findExamResultRowByRowNumber } from '../repositories/exam_result_query_repository';
import { isAccessKeyValid } from '../repositories/viewer_log_repository';

/**
 * 閲覧画面の検索結果一覧から1件選択した際に google.script.run から呼び出される（15章）。
 * Access Keyは searchExamResults と同様、呼び出しのたびにサーバー側で再検証する。
 */
export const getExamResultDetail = (accessKey: string, rowNumber: number): ExamResultDetail => {
  if (!isAccessKeyValid(accessKey)) {
    throw new Error(VIEWER_ACCESS_KEY_INVALID_ERROR_MESSAGE);
  }

  const row = findExamResultRowByRowNumber(rowNumber);
  if (row === null) {
    throw new Error(`受験結果が見つかりません（行番号: ${rowNumber}）`);
  }

  return buildExamResultDetail(row);
};
