import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as geminiClient from '../../../infrastructure/gemini_client';
import { scoreDescriptiveAnswer } from '../descriptive_scorer';

vi.mock('../../../infrastructure/gemini_client');

describe('scoreDescriptiveAnswer', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  test('未回答の場合はGeminiを呼び出さず0点を返す', () => {
    const result = scoreDescriptiveAnswer('問題文', '模範回答', '   ');

    expect(geminiClient.generateContent).not.toHaveBeenCalled();
    expect(result).toEqual({ score: 0, feedback: '未回答のため0点としました。' });
  });

  test('Geminiのレスポンス（JSON）を score/feedback としてパースする', () => {
    vi.mocked(geminiClient.generateContent).mockReturnValue('{"score":85,"feedback":"概ね正しい実装です"}');

    const result = scoreDescriptiveAnswer('問題文', '模範回答', '受験者の回答');

    expect(geminiClient.generateContent).toHaveBeenCalledWith(expect.stringContaining('問題文'));
    expect(result).toEqual({ score: 85, feedback: '概ね正しい実装です' });
  });

  test('Markdownのコードブロックで囲まれていても解析できる', () => {
    vi.mocked(geminiClient.generateContent).mockReturnValue('```json\n{"score":60,"feedback":"やや不足"}\n```');

    const result = scoreDescriptiveAnswer('問題文', '模範回答', '受験者の回答');

    expect(result).toEqual({ score: 60, feedback: 'やや不足' });
  });

  test('scoreが0〜100の範囲外の場合は範囲内に丸める', () => {
    vi.mocked(geminiClient.generateContent).mockReturnValue('{"score":150,"feedback":"満点超過"}');

    const result = scoreDescriptiveAnswer('問題文', '模範回答', '受験者の回答');

    expect(result.score).toBe(100);
  });

  test('Gemini呼び出しが例外を投げた場合は0点として扱い、例外を伝播させない', () => {
    vi.mocked(geminiClient.generateContent).mockImplementation(() => {
      throw new Error('network error');
    });

    const result = scoreDescriptiveAnswer('問題文', '模範回答', '受験者の回答');

    expect(result).toEqual({ score: 0, feedback: '採点処理でエラーが発生したため0点としました。' });
  });

  test('レスポンスがJSON形式・期待するプロパティを持たない場合は0点として扱う', () => {
    vi.mocked(geminiClient.generateContent).mockReturnValue('{"foo":"bar"}');

    const result = scoreDescriptiveAnswer('問題文', '模範回答', '受験者の回答');

    expect(result.score).toBe(0);
  });
});
