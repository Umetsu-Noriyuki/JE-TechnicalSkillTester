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

/** 指定したシート（タブ）の末尾に1行追記する。 */
export const appendSheetRow = (sheetName: string, row: readonly (string | number | Date)[]): void => {
  getSheet(sheetName).appendRow([...row]);
};
