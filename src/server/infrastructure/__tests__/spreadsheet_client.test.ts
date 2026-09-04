import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { appendSheetRow, getSheetValues } from '../spreadsheet_client';

vi.mock('../script_properties_client', () => ({
  getSpreadsheetId: vi.fn().mockReturnValue('test-spreadsheet-id'),
}));

describe('spreadsheet_client', () => {
  const getValues = vi.fn();
  const getDataRange = vi.fn();
  const appendRow = vi.fn();
  const getSheetByName = vi.fn();
  const openById = vi.fn();

  beforeEach(() => {
    getValues.mockReset().mockReturnValue([['a', 'b']]);
    getDataRange.mockReset().mockReturnValue({ getValues });
    appendRow.mockReset();
    getSheetByName.mockReset().mockReturnValue({ getDataRange, appendRow });
    openById.mockReset().mockReturnValue({ getSheetByName });

    (globalThis as { SpreadsheetApp?: unknown }).SpreadsheetApp = { openById };
  });

  afterEach(() => {
    delete (globalThis as { SpreadsheetApp?: unknown }).SpreadsheetApp;
  });

  describe('getSheetValues', () => {
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

  describe('appendSheetRow', () => {
    test('指定したシートの末尾に1行追記する', () => {
      appendSheetRow('受験結果', ['a', 1, new Date('2026-04-10')]);

      expect(getSheetByName).toHaveBeenCalledWith('受験結果');
      expect(appendRow).toHaveBeenCalledWith(['a', 1, new Date('2026-04-10')]);
    });

    test('指定したシートが存在しない場合はエラーを投げる', () => {
      getSheetByName.mockReturnValue(null);

      expect(() => appendSheetRow('存在しないシート', ['a'])).toThrow('存在しないシート');
    });
  });
});
