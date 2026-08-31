import { CATEGORY_NAMES, SHEET_NAMES } from '../config/constants';
import type { ExamResultRecord } from '../domain/models/exam_result_record';
import { appendSheetRow } from '../infrastructure/spreadsheet_client';
import { withLock } from '../infrastructure/lock_service_client';

const formatCategoryCell = (record: ExamResultRecord, categoryName: string): string => {
  const score = record.categoryScores.find((s) => s.categoryName === categoryName);
  if (score === undefined) {
    return '-';
  }
  return `${score.correctRate}% (${score.choiceCorrectCount}/${score.choiceQuestionCount})`;
};

const formatDuration = (record: ExamResultRecord): string => {
  const minutes = Math.floor(record.elapsedSeconds / 60);
  const seconds = record.elapsedSeconds % 60;
  const statusLabel = record.isTimedOut ? '時間切れ' : '時間内に終了';
  return `${minutes}分${seconds}秒（${statusLabel}）`;
};

const toRow = (record: ExamResultRecord): (string | number | Date)[] => [
  record.recordedAt,
  record.roleLabel,
  record.name,
  record.employeeNumber,
  record.department,
  record.overallCorrectRate,
  ...CATEGORY_NAMES.map((categoryName) => formatCategoryCell(record, categoryName)),
  formatDuration(record),
  record.answerDetailsJson,
];

/**
 * 「受験結果」シートへ1行追記する（11-2章の列構成A〜M）。
 * 複数受験者の同時書き込みによる競合を防ぐため、スクリプトロックを取得して実行する（11-3章）。
 */
export const appendExamResult = (record: ExamResultRecord): void => {
  withLock(() => {
    appendSheetRow(SHEET_NAMES.examResult, toRow(record));
  });
};
