import { SHEET_NAMES } from '../config/constants';
import { getSheetValues } from '../infrastructure/spreadsheet_client';

const HEADER_ROW_COUNT = 1;

/**
 * 「受験許可」シートのA列（2行目以降）から、受験を許可する氏名の一覧を取得する（6-3章）。
 * 空欄の行は無視する。
 */
export const findAllowedExamineeNames = (): string[] => {
  const rows = getSheetValues(SHEET_NAMES.examPermission);
  return rows
    .slice(HEADER_ROW_COUNT)
    .map((row) => row[0])
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '');
};
