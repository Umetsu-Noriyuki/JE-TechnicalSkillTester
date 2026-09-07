import { getSpreadsheetId } from './script_properties_client';

const getSheet = (sheetName: string): GoogleAppsScript.Spreadsheet.Sheet => {
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet === null) {
    throw new Error(`シート「${sheetName}」が見つかりません`);
  }
  return sheet;
};

/**
 * 指定したシート（タブ）の全データを二次元配列で返す薄いラッパー。
 * セル値の型はスプレッドシート側で保証されないため unknown とし、
 * 呼び出し側（repository層）で安全にナローイングして利用する。
 */
export const getSheetValues = (sheetName: string): unknown[][] => getSheet(sheetName).getDataRange().getValues();

/** 指定したシート（タブ）の末尾に1行追記し、追記した行番号（1始まり）を返す。 */
export const appendSheetRow = (sheetName: string, row: readonly (string | number | Date)[]): number => {
  const sheet = getSheet(sheetName);
  sheet.appendRow([...row]);
  return sheet.getLastRow();
};

/** 指定したシート・行の、startColumn（1始まり）から numColumns 列分の値を1次元配列で返す。 */
export const getRowValues = (
  sheetName: string,
  rowNumber: number,
  startColumn: number,
  numColumns: number,
): unknown[] => getSheet(sheetName).getRange(rowNumber, startColumn, 1, numColumns).getValues()[0] ?? [];

/** 指定したシート・行の、startColumn（1始まり）から values の要素数分だけ値を書き込む。 */
export const setRowValues = (
  sheetName: string,
  rowNumber: number,
  startColumn: number,
  values: readonly (string | number)[],
): void => {
  getSheet(sheetName).getRange(rowNumber, startColumn, 1, values.length).setValues([[...values]]);
};
