import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { generateContent } from '../gemini_client';

vi.mock('../script_properties_client', () => ({
  getGeminiApiKey: vi.fn().mockReturnValue('test-api-key'),
}));

const createHttpResponse = (statusCode: number, contentText: string) => ({
  getResponseCode: vi.fn().mockReturnValue(statusCode),
  getContentText: vi.fn().mockReturnValue(contentText),
});

const scoreResponseJson = (score: number, feedback: string): string =>
  JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ score, feedback }) }] } }] });

const okResponse = (score: number, feedback: string) => createHttpResponse(200, scoreResponseJson(score, feedback));
const errorResponse = (statusCode: number) =>
  createHttpResponse(statusCode, JSON.stringify({ error: { code: statusCode, status: 'ERROR' } }));

describe('generateContent', () => {
  const fetch = vi.fn();

  beforeEach(() => {
    fetch.mockReset();
    (globalThis as { UrlFetchApp?: unknown }).UrlFetchApp = { fetch };
  });

  afterEach(() => {
    delete (globalThis as { UrlFetchApp?: unknown }).UrlFetchApp;
  });

  test('APIキー付きURLへPOSTし、レスポンスのテキスト部分を返す', () => {
    fetch.mockReturnValue(okResponse(80, '良い回答です'));

    const result = generateContent('採点してください');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({ method: 'post' }),
    );
    const [url, options] = fetch.mock.calls[0] ?? [];
    expect(url).toContain('key=test-api-key');
    expect(JSON.parse((options as { payload: string }).payload)).toMatchObject({
      generationConfig: { responseMimeType: 'application/json' },
    });
    expect(result).toBe('{"score":80,"feedback":"良い回答です"}');
  });

  test('HTTPステータスが2xx以外の場合はエラーを投げる', () => {
    fetch.mockReturnValue(errorResponse(500));

    expect(() => generateContent('採点してください')).toThrow('500');
  });

  test('レスポンスにテキストが含まれない場合はエラーを投げる', () => {
    fetch.mockReturnValue(createHttpResponse(200, JSON.stringify({ candidates: [] })));

    expect(() => generateContent('採点してください')).toThrow('テキストを取得できませんでした');
  });
});
