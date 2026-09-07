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
    // 速度改善は generateContentBatch による並列化のみで対応する。
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
 */
export const generateContent = (prompt: string): string => {
  const response = UrlFetchApp.fetch(buildUrl(), buildRequestOptions(prompt));
  return extractText(response);
};

/**
 * 複数のプロンプトを `UrlFetchApp.fetchAll()` でまとめて並列送信する（10-2章、12章の外部API依存対策）。
 * 記述式問題を1問ずつ直列で採点すると待ち時間が積み上がるため、並列化して合計待ち時間を短縮する。
 * 個々のリクエストが失敗しても他の結果には影響しない（失敗した要素は Error を返す）。
 */
export const generateContentBatch = (prompts: readonly string[]): (string | Error)[] => {
  if (prompts.length === 0) {
    return [];
  }

  const url = buildUrl();
  const requests = prompts.map((prompt) => ({ url, ...buildRequestOptions(prompt) }));
  const responses = UrlFetchApp.fetchAll(requests);

  return responses.map((response) => {
    try {
      return extractText(response);
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  });
};
