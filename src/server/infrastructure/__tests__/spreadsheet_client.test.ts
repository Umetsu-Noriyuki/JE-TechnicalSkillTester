import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { appendSheetRow, getRowValues, getSheetValues, setRowValues } from '../spreadsheet_client';

vi.mock('../script_properties_client', () => ({
  getSpreadsheetId: vi.fn().mockReturnValue('test-spreadsheet-id'),
}));

describe('spreadsheet_client', () => {
  const getValues = vi.fn();
  const getDataRange = vi.fn();
  const appendRow = vi.fn();
  const getLastRow = vi.fn();
  const setValues = vi.fn();
  const getRange = vi.fn();
  const getSheetByName = vi.fn();
  const openById = vi.fn();

  beforeEach(() => {
    getValues.mockReset().mockReturnValue([['a', 'b']]);
    getDataRange.mockReset().mockReturnValue({ getValues });
    appendRow.mockReset();
    getLastRow.mockReset().mockReturnValue(5);
    setValues.mockReset();
    getRange.mockReset().mockReturnValue({ getValues: vi.fn().mockReturnValue([['x', 1]]), setValues });
    getSheetByName.mockReset().mockReturnValue({ getDataRange, appendRow, getLastRow, getRange });
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
    test('指定したシートの末尾に1行追記し、追記した行番号を返す', () => {
      const result = appendSheetRow('受験結果', ['a', 1, new Date('2026-04-10')]);

      expect(getSheetByName).toHaveBeenCalledWith('受験結果');
      expect(appendRow).toHaveBeenCalledWith(['a', 1, new Date('2026-04-10')]);
      expect(result).toBe(5);
    });

    test('指定したシートが存在しない場合はエラーを投げる', () => {
      getSheetByName.mockReturnValue(null);

      expect(() => appendSheetRow('存在しないシート', ['a'])).toThrow('存在しないシート');
    });
  });

  describe('getRowValues', () => {
    test('指定した行・列範囲の値を1次元配列で返す', () => {
      const result = getRowValues('受験結果', 5, 14, 7);

      expect(getRange).toHaveBeenCalledWith(5, 14, 1, 7);
      expect(result).toEqual(['x', 1]);
    });
  });

  describe('setRowValues', () => {
    test('指定した行・開始列から値を書き込む', () => {
      setRowValues('受験結果', 5, 6, [80, '75% (300/400点)']);

      expect(getRange).toHaveBeenCalledWith(5, 6, 1, 2);
      expect(setValues).toHaveBeenCalledWith([[80, '75% (300/400点)']]);
    });
  });
});
