const SPREADSHEET_ID_PROPERTY_KEY = 'SPREADSHEET_ID';

/**
 * 問題マスタ／受験結果を保持するスプレッドシートのIDを、スクリプトプロパティから取得する。
 * IDはソースコードにハードコードせず、Apps Scriptエディタの
 * 「プロジェクトの設定」→「スクリプト プロパティ」に事前登録しておくこと。
 */
export const getSpreadsheetId = (): string => {
  const id = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROPERTY_KEY);
  if (id === null) {
    throw new Error(`スクリプトプロパティ ${SPREADSHEET_ID_PROPERTY_KEY} が未設定です`);
  }
  return id;
};
