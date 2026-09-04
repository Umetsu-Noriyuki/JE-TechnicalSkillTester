import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { generateContent } from '../gemini_client';

vi.mock('../script_properties_client', () => ({
  getGeminiApiKey: vi.fn().mockReturnValue('test-api-key'),
}));

describe('generateContent', () => {
  const getResponseCode = vi.fn();
  const getContentText = vi.fn();
  const fetch = vi.fn();

  beforeEach(() => {
    getResponseCode.mockReset().mockReturnValue(200);
    getContentText.mockReset();
    fetch.mockReset().mockReturnValue({ getResponseCode, getContentText });

    (globalThis as { UrlFetchApp?: unknown }).UrlFetchApp = { fetch };
  });

  afterEach(() => {
    delete (globalThis as { UrlFetchApp?: unknown }).UrlFetchApp;
  });

  test('APIキー付きURLへPOSTし、レスポンスのテキスト部分を返す', () => {
    getContentText.mockReturnValue(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"score":80,"feedback":"良い回答です"}' }] } }] }),
    );

    const result = generateContent('採点してください');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({ method: 'post' }),
    );
    const [url] = fetch.mock.calls[0] ?? [];
    expect(url).toContain('key=test-api-key');
    expect(result).toBe('{"score":80,"feedback":"良い回答です"}');
  });

  test('HTTPステータスが2xx以外の場合はエラーを投げる', () => {
    getResponseCode.mockReturnValue(500);
    getContentText.mockReturnValue('Internal Server Error');

    expect(() => generateContent('採点してください')).toThrow('500');
  });

  test('レスポンスにテキストが含まれない場合はエラーを投げる', () => {
    getContentText.mockReturnValue(JSON.stringify({ candidates: [] }));

    expect(() => generateContent('採点してください')).toThrow('テキストを取得できませんでした');
  });
});
