const SPREADSHEET_ID_PROPERTY_KEY = 'SPREADSHEET_ID';
const GEMINI_API_KEY_PROPERTY_KEY = 'GEMINI_API_KEY';

const getRequiredProperty = (key: string): string => {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (value === null) {
    throw new Error(`スクリプトプロパティ ${key} が未設定です`);
  }
  return value;
};

/**
 * 問題マスタ／受験結果を保持するスプレッドシートのIDを、スクリプトプロパティから取得する。
 * IDはソースコードにハードコードせず、Apps Scriptエディタの
 * 「プロジェクトの設定」→「スクリプト プロパティ」に事前登録しておくこと。
 */
export const getSpreadsheetId = (): string => getRequiredProperty(SPREADSHEET_ID_PROPERTY_KEY);

/**
 * 記述式の採点（Gemini API）に使用するAPIキーを、スクリプトプロパティから取得する（10-2章）。
 * Google AI Studio で発行したAPIキーを、SPREADSHEET_ID と同様にスクリプトプロパティへ登録すること。
 */
export const getGeminiApiKey = (): string => getRequiredProperty(GEMINI_API_KEY_PROPERTY_KEY);
