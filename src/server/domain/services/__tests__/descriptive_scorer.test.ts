import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as geminiClient from '../../../infrastructure/gemini_client';
import { scoreDescriptiveAnswersBatch } from '../descriptive_scorer';

vi.mock('../../../infrastructure/gemini_client');

describe('scoreDescriptiveAnswersBatch', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const sleep = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sleep.mockReset();
    (globalThis as { Utilities?: unknown }).Utilities = { sleep };
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
    delete (globalThis as { Utilities?: unknown }).Utilities;
  });

  test('全て未回答の場合はAPIを呼び出さず、全て0点として扱う', () => {
    const result = scoreDescriptiveAnswersBatch([
      { questionId: 'q1', question: '問題1', sampleAnswer: '模範1', studentAnswer: '' },
      { questionId: 'q2', question: '問題2', sampleAnswer: '模範2', studentAnswer: '  ' },
    ]);

    expect(geminiClient.generateContent).not.toHaveBeenCalled();
    expect(result).toEqual([
      { questionId: 'q1', score: 0, feedback: '未回答のため0点としました。' },
      { questionId: 'q2', score: 0, feedback: '未回答のため0点としました。' },
    ]);
  });

  test('複数の記述式問題を1回のリクエストにまとめて送信し、questionIdで結果を対応させる', () => {
    vi.mocked(geminiClient.generateContent).mockReturnValue(
      JSON.stringify([
        { questionId: 'q2', score: 40, feedback: '不足があります' },
        { questionId: 'q1', score: 85, feedback: '概ね正しい実装です' },
      ]),
    );

    const result = scoreDescriptiveAnswersBatch([
      { questionId: 'q1', question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' },
      { questionId: 'q2', question: '問題2', sampleAnswer: '模範2', studentAnswer: '回答2' },
    ]);

    expect(geminiClient.generateContent).toHaveBeenCalledTimes(1);
    const [prompt] = vi.mocked(geminiClient.generateContent).mock.calls[0] ?? [''];
    expect(prompt).toContain('問題1');
    expect(prompt).toContain('問題2');
    expect(result).toEqual([
      { questionId: 'q1', score: 85, feedback: '概ね正しい実装です' },
      { questionId: 'q2', score: 40, feedback: '不足があります' },
    ]);
  });

  test('未回答と回答済みが混在する場合、APIには回答済み分のみ渡す', () => {
    vi.mocked(geminiClient.generateContent).mockReturnValue(
      JSON.stringify([{ questionId: 'q2', score: 70, feedback: 'やや不足' }]),
    );

    const result = scoreDescriptiveAnswersBatch([
      { questionId: 'q1', question: '問題1', sampleAnswer: '模範1', studentAnswer: '' },
      { questionId: 'q2', question: '問題2', sampleAnswer: '模範2', studentAnswer: '回答2' },
    ]);

    const [prompt] = vi.mocked(geminiClient.generateContent).mock.calls[0] ?? [''];
    expect(prompt).not.toContain('"question":"問題1"');
    expect(result).toEqual([
      { questionId: 'q1', score: 0, feedback: '未回答のため0点としました。' },
      { questionId: 'q2', score: 70, feedback: 'やや不足' },
    ]);
  });

  test('失敗した場合はGEMINI_RETRY_DELAY_MILLISECONDS待機して再試行し、成功すればその結果を返す', () => {
    vi.mocked(geminiClient.generateContent)
      .mockImplementationOnce(() => {
        throw new Error('Gemini APIの呼び出しに失敗しました（status: 500）');
      })
      .mockReturnValueOnce(JSON.stringify([{ questionId: 'q1', score: 90, feedback: '良好' }]));

    const result = scoreDescriptiveAnswersBatch([
      { questionId: 'q1', question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' },
    ]);

    expect(geminiClient.generateContent).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(30000);
    expect(result).toEqual([{ questionId: 'q1', score: 90, feedback: '良好' }]);
  });

  test('最大再試行回数（3回、計4回試行）を超えて失敗し続けた場合、回答済みの項目全てを0点として扱う', () => {
    vi.mocked(geminiClient.generateContent).mockImplementation(() => {
      throw new Error('Gemini APIの呼び出しに失敗しました（status: 429）');
    });

    const result = scoreDescriptiveAnswersBatch([
      { questionId: 'q1', question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' },
      { questionId: 'q2', question: '問題2', sampleAnswer: '模範2', studentAnswer: '' },
    ]);

    expect(geminiClient.generateContent).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(result).toEqual([
      { questionId: 'q1', score: 0, feedback: '採点処理でエラーが発生したため0点としました。' },
      { questionId: 'q2', score: 0, feedback: '未回答のため0点としました。' },
    ]);
  });

  test('レスポンスに一部のquestionIdの結果が含まれない場合は失敗として再試行する', () => {
    vi.mocked(geminiClient.generateContent)
      .mockReturnValueOnce(JSON.stringify([{ questionId: 'q1', score: 80, feedback: '良好' }]))
      .mockReturnValueOnce(
        JSON.stringify([
          { questionId: 'q1', score: 80, feedback: '良好' },
          { questionId: 'q2', score: 60, feedback: 'やや不足' },
        ]),
      );

    const result = scoreDescriptiveAnswersBatch([
      { questionId: 'q1', question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' },
      { questionId: 'q2', question: '問題2', sampleAnswer: '模範2', studentAnswer: '回答2' },
    ]);

    expect(geminiClient.generateContent).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { questionId: 'q1', score: 80, feedback: '良好' },
      { questionId: 'q2', score: 60, feedback: 'やや不足' },
    ]);
  });

  test('Markdownのコードブロックで囲まれていても解析できる', () => {
    vi.mocked(geminiClient.generateContent).mockReturnValue(
      `\`\`\`json\n${JSON.stringify([{ questionId: 'q1', score: 60, feedback: 'やや不足' }])}\n\`\`\``,
    );

    const result = scoreDescriptiveAnswersBatch([
      { questionId: 'q1', question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' },
    ]);

    expect(result).toEqual([{ questionId: 'q1', score: 60, feedback: 'やや不足' }]);
  });

  test('scoreが0〜100の範囲外の場合は範囲内に丸める', () => {
    vi.mocked(geminiClient.generateContent).mockReturnValue(
      JSON.stringify([{ questionId: 'q1', score: 150, feedback: '満点超過' }]),
    );

    const result = scoreDescriptiveAnswersBatch([
      { questionId: 'q1', question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' },
    ]);

    expect(result[0]?.score).toBe(100);
  });
});
