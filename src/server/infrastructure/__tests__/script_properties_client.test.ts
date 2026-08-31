import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getSpreadsheetId } from '../script_properties_client';

describe('getSpreadsheetId', () => {
  const getProperty = vi.fn();
  const getScriptProperties = vi.fn();

  beforeEach(() => {
    getProperty.mockReset();
    getScriptProperties.mockReset().mockReturnValue({ getProperty });

    (globalThis as { PropertiesService?: unknown }).PropertiesService = {
      getScriptProperties,
    };
  });

  afterEach(() => {
    delete (globalThis as { PropertiesService?: unknown }).PropertiesService;
  });

  test('スクリプトプロパティにSPREADSHEET_IDが設定されている場合、その値を返す', () => {
    getProperty.mockReturnValue('abc123');

    const result = getSpreadsheetId();

    expect(getProperty).toHaveBeenCalledWith('SPREADSHEET_ID');
    expect(result).toBe('abc123');
  });

  test('スクリプトプロパティにSPREADSHEET_IDが未設定の場合、エラーを投げる', () => {
    getProperty.mockReturnValue(null);

    expect(() => getSpreadsheetId()).toThrow('SPREADSHEET_ID');
  });
});
