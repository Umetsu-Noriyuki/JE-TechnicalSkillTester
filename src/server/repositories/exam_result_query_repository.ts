import type { AnswerDetail } from '../../shared/types/answer_detail';
import { EXAM_RESULT_START_ROW, SHEET_NAMES } from '../config/constants';
import type { ParsedExamResultRow } from '../domain/models/exam_result_row';
import { getRowValues, getSheetValues } from '../infrastructure/spreadsheet_client';

/** M列（回答詳細JSON）とU列（禁止操作回数）を読み取るため、A〜U列（21列）を対象とする。 */
const EXAM_RESULT_READ_COLUMN_COUNT = 21;

/** U列（禁止操作回数）の配列上のインデックス（0始まり）。 */
const PROHIBITED_OPERATION_COUNT_INDEX = 20;

/**
 * 数字のみの社員番号等は、appendRow時にGoogleスプレッドシート側がセルを数値型として
 * 自動認識することがある。読み取り時に typeof value === 'number' のケースも文字列へ変換し、
 * 表示が空欄になることを防ぐ。
 */
const asString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
};

const parseAnswerDetailsJson = (value: unknown): AnswerDetail[] => {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as AnswerDetail[]) : [];
  } catch {
    return [];
  }
};

/**
 * U列（禁止操作回数）を数値として読み取る。U列追加前に記録された行（空欄）や、
 * 0以上の整数でない値は0として扱う。
 */
const asProhibitedOperationCount = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;

/**
 * 「受験結果」シートの1行（A〜U列の値の配列）を構造化データへ変換する。
 * A列（記録日時）がDateでない行（ヘッダー行・空行等）は null を返す。
 */
const parseExamResultRow = (row: readonly unknown[], rowNumber: number): ParsedExamResultRow | null => {
  const recordedAt = row[0];
  const roleLabel = row[1];
  const name = row[2];

  if (!(recordedAt instanceof Date) || typeof roleLabel !== 'string' || typeof name !== 'string') {
    return null;
  }

  const overallCorrectRate = row[5];

  return {
    rowNumber,
    recordedAt,
    roleLabel,
    name,
    employeeNumber: asString(row[3]),
    department: asString(row[4]),
    overallCorrectRate: typeof overallCorrectRate === 'number' ? overallCorrectRate : 0,
    durationText: asString(row[11]),
    answerDetails: parseAnswerDetailsJson(row[12]),
    prohibitedOperationCount: asProhibitedOperationCount(row[PROHIBITED_OPERATION_COUNT_INDEX]),
  };
};

/**
 * 「受験結果」シートの全データ行を読み取り、構造化する（15章：閲覧画面の検索対象）。
 * ヘッダー行・空行など、A列が日時でない行は読み飛ばす。
 */
export const findAllExamResultRows = (): ParsedExamResultRow[] => {
  const rows = getSheetValues(SHEET_NAMES.examResult);
  const dataRows = rows.slice(EXAM_RESULT_START_ROW - 1);

  const parsedRows: ParsedExamResultRow[] = [];
  dataRows.forEach((row, index) => {
    const parsed = parseExamResultRow(row, index + EXAM_RESULT_START_ROW);
    if (parsed !== null) {
      parsedRows.push(parsed);
    }
  });
  return parsedRows;
};

/** 「受験結果」シートの指定行を読み取り、構造化する（15章：閲覧画面の詳細表示）。 */
export const findExamResultRowByRowNumber = (rowNumber: number): ParsedExamResultRow | null =>
  parseExamResultRow(getRowValues(SHEET_NAMES.examResult, rowNumber, 1, EXAM_RESULT_READ_COLUMN_COUNT), rowNumber);
