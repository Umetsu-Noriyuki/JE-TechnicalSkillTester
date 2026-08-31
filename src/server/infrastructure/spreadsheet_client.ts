import { getSpreadsheetId } from './script_properties_client';

/**
 * 指定したシート（タブ）の全データを二次元配列で返す薄いラッパー。
 * セル値の型はスプレッドシート側で保証されないため unknown とし、
 * 呼び出し側（repository層）で安全にナローイングして利用する。
 */
export const getSheetValues = (sheetName: string): unknown[][] => {
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet === null) {
    throw new Error(`シート「${sheetName}」が見つかりません`);
  }
  return sheet.getDataRange().getValues();
};
