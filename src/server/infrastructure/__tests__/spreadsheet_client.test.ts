import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getSheetValues } from '../spreadsheet_client';

vi.mock('../script_properties_client', () => ({
  getSpreadsheetId: vi.fn().mockReturnValue('test-spreadsheet-id'),
}));

describe('getSheetValues', () => {
  const getValues = vi.fn();
  const getDataRange = vi.fn();
  const getSheetByName = vi.fn();
  const openById = vi.fn();

  beforeEach(() => {
    getValues.mockReset().mockReturnValue([['a', 'b']]);
    getDataRange.mockReset().mockReturnValue({ getValues });
    getSheetByName.mockReset().mockReturnValue({ getDataRange });
    openById.mockReset().mockReturnValue({ getSheetByName });

    (globalThis as { SpreadsheetApp?: unknown }).SpreadsheetApp = { openById };
  });

  afterEach(() => {
    delete (globalThis as { SpreadsheetApp?: unknown }).SpreadsheetApp;
  });

  test('スクリプトプロパティのIDでスプレッドシートを開き、指定したシート名の全データを返す', () => {
    const result = getSheetValues('問題マスタ');

    expect(openById).toHaveBeenCalledWith('test-spreadsheet-id');
    expect(getSheetByName).toHaveBeenCalledWith('問題マスタ');
    expect(result).toEqual([['a', 'b']]);
  });

  test('指定したシートが存在しない場合はエラーを投げる', () => {
    getSheetByName.mockReturnValue(null);

    expect(() => getSheetValues('存在しないシート')).toThrow('存在しないシート');
  });
});
