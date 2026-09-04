import { GEMINI_API_BASE_URL, GEMINI_MODEL } from '../config/constants';
import { getGeminiApiKey } from './script_properties_client';

interface GeminiGenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/**
 * Gemini API（generateContent）へプロンプトを送信し、テキスト応答を返す薄いラッパー（10-2章）。
 * GASのサーバー側実行は同期のため、UrlFetchApp.fetch() もそのまま同期関数として扱う。
 */
export const generateContent = (prompt: string): string => {
  const url = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${getGeminiApiKey()}`;

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
    muteHttpExceptions: true,
  });

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
