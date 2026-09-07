import {
  GEMINI_API_BASE_URL,
  GEMINI_MAX_REQUESTS_PER_MINUTE,
  GEMINI_MODEL,
  GEMINI_RATE_LIMIT_COOLDOWN_MILLISECONDS,
  GEMINI_RETRY_DELAY_MILLISECONDS,
} from '../config/constants';
import { getGeminiApiKey } from './script_properties_client';

interface GeminiGenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/** 429（レート制限超過）・503（一時的な高負荷）は、時間を置けば成功する見込みが高い一時的なエラー。 */
const RETRYABLE_STATUS_CODES = new Set([429, 503]);

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
 */
export const generateContent = (prompt: string): string => {
  const response = UrlFetchApp.fetch(buildUrl(), buildRequestOptions(prompt));
  return extractText(response);
};

/**
 * 指定したpromptの一部（indexes）だけを対象に、fetchAllで並列リクエストする。
 * 成功した要素は results[元のindex] にテキストをセットし、失敗した要素はそのままにする。
 * 戻り値は「今回リトライ対象にすべき（429/503だった）元のindexの配列」。
 */
const runFetchAllPass = (
  url: string,
  prompts: readonly string[],
  indexes: readonly number[],
  results: (string | Error | undefined)[],
): number[] => {
  const requests = indexes.map((index) => ({ url, ...buildRequestOptions(prompts[index] as string) }));
  const responses = UrlFetchApp.fetchAll(requests);

  const retryIndexes: number[] = [];
  responses.forEach((response, i) => {
    const originalIndex = indexes[i] as number;
    if (RETRYABLE_STATUS_CODES.has(response.getResponseCode())) {
      retryIndexes.push(originalIndex);
      return;
    }
    try {
      results[originalIndex] = extractText(response);
    } catch (error) {
      results[originalIndex] = error instanceof Error ? error : new Error(String(error));
    }
  });
  return retryIndexes;
};

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/**
 * 複数のプロンプトをまとめてGemini APIへ送信する（10-2章、12章の外部API依存対策）。
 * - 無料枠のレート制限（1分あたり GEMINI_MAX_REQUESTS_PER_MINUTE 件）を超えないよう、
 *   その件数ごとのチャンクに分割し、チャンク間は GEMINI_RATE_LIMIT_COOLDOWN_MILLISECONDS だけ
 *   待機する。チャンク内は fetchAll で並列送信する。
 * - 429（レート制限超過）・503（一時的な高負荷）は一時的なエラーとみなし、
 *   GEMINI_RETRY_DELAY_MILLISECONDS 待機したうえで、失敗した要素のみ1回だけ再試行する。
 * - それでも失敗した場合、および400等の再試行不可能なエラーの場合は Error を返す
 *   （個々の失敗が他の要素の結果に影響することはない）。
 * 戻り値の配列は、引数 prompts と同じ順序・同じ要素数になる。
 */
export const generateContentBatch = (prompts: readonly string[]): (string | Error)[] => {
  if (prompts.length === 0) {
    return [];
  }

  const url = buildUrl();
  const results: (string | Error | undefined)[] = new Array(prompts.length).fill(undefined);
  const chunks = chunk(
    prompts.map((_, index) => index),
    GEMINI_MAX_REQUESTS_PER_MINUTE,
  );

  chunks.forEach((indexChunk, chunkIndex) => {
    if (chunkIndex > 0) {
      Utilities.sleep(GEMINI_RATE_LIMIT_COOLDOWN_MILLISECONDS);
    }

    const retryIndexes = runFetchAllPass(url, prompts, indexChunk, results);
    if (retryIndexes.length > 0) {
      Utilities.sleep(GEMINI_RETRY_DELAY_MILLISECONDS);
      runFetchAllPass(url, prompts, retryIndexes, results).forEach((stillFailingIndex) => {
        results[stillFailingIndex] = new Error('Gemini APIのレート制限・過負荷により再試行後も失敗しました');
      });
    }
  });

  return results.map((result) => result ?? new Error('Gemini APIの呼び出し結果を取得できませんでした'));
};
