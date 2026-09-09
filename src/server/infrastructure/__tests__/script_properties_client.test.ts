import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getGeminiApiKey, getSpreadsheetId } from '../script_properties_client';

describe('script_properties_client', () => {
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

  describe('getSpreadsheetId', () => {
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

  describe('getGeminiApiKey', () => {
    test('スクリプトプロパティにGEMINI_API_KEYが設定されている場合、その値を返す', () => {
      getProperty.mockReturnValue('gemini-key-xyz');

      const result = getGeminiApiKey();

      expect(getProperty).toHaveBeenCalledWith('GEMINI_API_KEY');
      expect(result).toBe('gemini-key-xyz');
    });

    test('スクリプトプロパティにGEMINI_API_KEYが未設定の場合、エラーを投げる', () => {
      getProperty.mockReturnValue(null);

      expect(() => getGeminiApiKey()).toThrow('GEMINI_API_KEY');
    });
  });
});
