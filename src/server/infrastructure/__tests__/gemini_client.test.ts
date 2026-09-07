import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { generateContent, generateContentBatch } from '../gemini_client';

vi.mock('../script_properties_client', () => ({
  getGeminiApiKey: vi.fn().mockReturnValue('test-api-key'),
}));

const createHttpResponse = (statusCode: number, contentText: string) => ({
  getResponseCode: vi.fn().mockReturnValue(statusCode),
  getContentText: vi.fn().mockReturnValue(contentText),
});

const scoreResponseJson = (score: number, feedback: string): string =>
  JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ score, feedback }) }] } }] });

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
    fetch.mockReturnValue(createHttpResponse(200, scoreResponseJson(80, '良い回答です')));

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
    fetch.mockReturnValue(createHttpResponse(500, 'Internal Server Error'));

    expect(() => generateContent('採点してください')).toThrow('500');
  });

  test('レスポンスにテキストが含まれない場合はエラーを投げる', () => {
    fetch.mockReturnValue(createHttpResponse(200, JSON.stringify({ candidates: [] })));

    expect(() => generateContent('採点してください')).toThrow('テキストを取得できませんでした');
  });
});

describe('generateContentBatch', () => {
  const fetchAll = vi.fn();

  beforeEach(() => {
    fetchAll.mockReset();
    (globalThis as { UrlFetchApp?: unknown }).UrlFetchApp = { fetchAll };
  });

  afterEach(() => {
    delete (globalThis as { UrlFetchApp?: unknown }).UrlFetchApp;
  });

  test('複数プロンプトをまとめてfetchAllへ渡し、それぞれのテキスト応答を順番通りに返す', () => {
    fetchAll.mockReturnValue([
      createHttpResponse(200, scoreResponseJson(80, '1問目')),
      createHttpResponse(200, scoreResponseJson(60, '2問目')),
    ]);

    const result = generateContentBatch(['プロンプト1', 'プロンプト2']);

    expect(fetchAll).toHaveBeenCalledTimes(1);
    const [requests] = fetchAll.mock.calls[0] ?? [];
    expect(requests).toHaveLength(2);
    expect((requests as { url: string }[])[0]?.url).toContain('key=test-api-key');
    expect(result).toEqual(['{"score":80,"feedback":"1問目"}', '{"score":60,"feedback":"2問目"}']);
  });

  test('一部のリクエストが失敗しても、その要素だけErrorになり他の結果には影響しない', () => {
    fetchAll.mockReturnValue([
      createHttpResponse(200, scoreResponseJson(80, '成功')),
      createHttpResponse(500, 'Internal Server Error'),
    ]);

    const result = generateContentBatch(['プロンプト1', 'プロンプト2']);

    expect(result[0]).toBe('{"score":80,"feedback":"成功"}');
    expect(result[1]).toBeInstanceOf(Error);
  });

  test('プロンプトが空配列の場合はfetchAllを呼ばず空配列を返す', () => {
    const result = generateContentBatch([]);

    expect(fetchAll).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
