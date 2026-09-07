import { GEMINI_API_BASE_URL, GEMINI_MODEL } from '../config/constants';
import { getGeminiApiKey } from './script_properties_client';

interface GeminiGenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

const buildUrl = (): string => `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${getGeminiApiKey()}`;

const buildRequestOptions = (prompt: string): GoogleAppsScript.URL_Fetch.URLFetchRequestOptions => ({
  method: 'post',
  contentType: 'application/json',
  payload: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    // thinkingConfig（内部思考の無効化）を一度試したが、GEMINI_MODELで
    // 「Request contains an invalid argument.」(400)を返すことが実機で確認されたため削除した。
    generationConfig: { responseMimeType: 'application/json' },
  }),
  muteHttpExceptions: true,
});

const extractText = (response: GoogleAppsScript.URL_Fetch.HTTPResponse): string => {
  const statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Gemini APIの呼び出しに失敗しました（status: ${statusCode}）: ${response.getContentText()}`);
  }

  const body = JSON.parse(response.getContentText()) as GeminiGenerateContentResponse;
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text === undefined) {
    throw new Error('Gemini APIのレスポンスからテキストを取得できませんでした');
  }
  return text;
};

/**
 * Gemini API（generateContent）へプロンプトを1件送信し、テキスト応答を返す薄いラッパー（10-2章）。
 * GASのサーバー側実行は同期のため、UrlFetchApp.fetch() もそのまま同期関数として扱う。
 * 記述式7問はここで1回のリクエストにまとめて送信するため（10-2章）、複数リクエストの
 * 並列化・レート制限チャンク分割は不要になり、呼び出し失敗時の再試行は
 * server/domain/services/descriptive_scorer.ts 側の責務とする。
 */
export const generateContent = (prompt: string): string => {
  const response = UrlFetchApp.fetch(buildUrl(), buildRequestOptions(prompt));
  return extractText(response);
};
