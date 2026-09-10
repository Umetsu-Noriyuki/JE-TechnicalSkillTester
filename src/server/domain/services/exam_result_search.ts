import type { ExamResultSearchFilter } from '../../../shared/types/exam_result_search';
import type { ParsedExamResultRow } from '../models/exam_result_row';

const startOfDay = (dateText: string): Date => new Date(`${dateText}T00:00:00`);
const endOfDay = (dateText: string): Date => new Date(`${dateText}T23:59:59.999`);

const isWithinDateRange = (recordedAt: Date, from: string | undefined, to: string | undefined): boolean => {
  if (from !== undefined && from !== '' && recordedAt < startOfDay(from)) {
    return false;
  }
  if (to !== undefined && to !== '' && recordedAt > endOfDay(to)) {
    return false;
  }
  return true;
};

const includesQuery = (target: string, query: string | undefined): boolean =>
  query === undefined || query.trim() === '' || target.includes(query);

/**
 * 「受験結果」シートの各行を、検索条件（15章）でAND条件により絞り込む純粋関数。
 * - 受験日時（A列）：開始日・終了日の範囲指定（両端を含む）
 * - 受験者区分（B列）：完全一致
 * - 氏名・社員番号・所属（C〜E列）：部分一致
 * いずれの条件も、未指定（undefinedまたは空文字）の場合はその条件をスキップする。
 */
export const filterExamResultRows = (
  rows: readonly ParsedExamResultRow[],
  filter: ExamResultSearchFilter,
): ParsedExamResultRow[] =>
  rows.filter((row) => {
    if (!isWithinDateRange(row.recordedAt, filter.recordedAtFrom, filter.recordedAtTo)) {
      return false;
    }
    if (filter.roleLabel !== undefined && filter.roleLabel !== '' && row.roleLabel !== filter.roleLabel) {
      return false;
    }
    return (
      includesQuery(row.name, filter.name) &&
      includesQuery(row.employeeNumber, filter.employeeNumber) &&
      includesQuery(row.department, filter.department)
    );
  });
