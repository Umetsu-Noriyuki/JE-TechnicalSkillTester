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

describe('generateContentBatch', () => {
  const fetchAll = vi.fn();
  const sleep = vi.fn();

  beforeEach(() => {
    fetchAll.mockReset();
    sleep.mockReset();
    (globalThis as { UrlFetchApp?: unknown }).UrlFetchApp = { fetchAll };
    (globalThis as { Utilities?: unknown }).Utilities = { sleep };
  });

  afterEach(() => {
    delete (globalThis as { UrlFetchApp?: unknown }).UrlFetchApp;
    delete (globalThis as { Utilities?: unknown }).Utilities;
  });

  test('件数がレート制限（4件）以下ならfetchAllは1回だけで、待機しない', () => {
    fetchAll.mockReturnValue([okResponse(80, '1問目'), okResponse(60, '2問目')]);

    const result = generateContentBatch(['プロンプト1', 'プロンプト2']);

    expect(fetchAll).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    const [requests] = fetchAll.mock.calls[0] ?? [];
    expect((requests as { url: string }[])[0]?.url).toContain('key=test-api-key');
    expect(result).toEqual(['{"score":80,"feedback":"1問目"}', '{"score":60,"feedback":"2問目"}']);
  });

  test('レート制限（4件）を超える場合はチャンク分割し、チャンク間でレート制限クールダウンだけ待機する', () => {
    // 7件 -> 4件 + 3件の2チャンク
    fetchAll
      .mockReturnValueOnce([okResponse(1, 'a'), okResponse(2, 'b'), okResponse(3, 'c'), okResponse(4, 'd')])
      .mockReturnValueOnce([okResponse(5, 'e'), okResponse(6, 'f'), okResponse(7, 'g')]);

    const prompts = Array.from({ length: 7 }, (_, i) => `プロンプト${i + 1}`);
    const result = generateContentBatch(prompts);

    expect(fetchAll).toHaveBeenCalledTimes(2);
    expect((fetchAll.mock.calls[0]?.[0] as unknown[]).length).toBe(4);
    expect((fetchAll.mock.calls[1]?.[0] as unknown[]).length).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(61000);
    expect(result).toHaveLength(7);
    expect(result[6]).toBe('{"score":7,"feedback":"g"}');
  });

  test('429を受け取った要素は、少し待ってから再試行し、成功すればその結果を採用する', () => {
    fetchAll
      .mockReturnValueOnce([okResponse(80, '成功'), errorResponse(429)])
      .mockReturnValueOnce([okResponse(50, '再試行で成功')]);

    const result = generateContentBatch(['プロンプト1', 'プロンプト2']);

    expect(fetchAll).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(30000);
    expect(result[0]).toBe('{"score":80,"feedback":"成功"}');
    expect(result[1]).toBe('{"score":50,"feedback":"再試行で成功"}');
  });

  test('503を受け取った要素も再試行対象になる', () => {
    fetchAll.mockReturnValueOnce([errorResponse(503)]).mockReturnValueOnce([okResponse(90, '再試行で成功')]);

    const result = generateContentBatch(['プロンプト1']);

    expect(result[0]).toBe('{"score":90,"feedback":"再試行で成功"}');
  });

  test('再試行しても429/503のままの場合はErrorとする', () => {
    fetchAll.mockReturnValueOnce([errorResponse(429)]).mockReturnValueOnce([errorResponse(429)]);

    const result = generateContentBatch(['プロンプト1']);

    expect(fetchAll).toHaveBeenCalledTimes(2);
    expect(result[0]).toBeInstanceOf(Error);
  });

  test('400等の再試行対象外のエラーは再試行せず即座にErrorとする', () => {
    fetchAll.mockReturnValue([okResponse(80, '成功'), errorResponse(400)]);

    const result = generateContentBatch(['プロンプト1', 'プロンプト2']);

    expect(fetchAll).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(result[1]).toBeInstanceOf(Error);
  });

  test('プロンプトが空配列の場合はfetchAllを呼ばず空配列を返す', () => {
    const result = generateContentBatch([]);

    expect(fetchAll).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
