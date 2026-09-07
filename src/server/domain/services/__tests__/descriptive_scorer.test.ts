import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as geminiClient from '../../../infrastructure/gemini_client';
import { scoreDescriptiveAnswers } from '../descriptive_scorer';

vi.mock('../../../infrastructure/gemini_client');

describe('scoreDescriptiveAnswers', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  test('未回答の項目はAPIの呼び出し対象から除外し0点を返す', () => {
    vi.mocked(geminiClient.generateContentBatch).mockReturnValue([]);

    const result = scoreDescriptiveAnswers([{ question: '問題文', sampleAnswer: '模範回答', studentAnswer: '   ' }]);

    expect(geminiClient.generateContentBatch).toHaveBeenCalledWith([]);
    expect(result).toEqual([{ score: 0, feedback: '未回答のため0点としました。' }]);
  });

  test('複数件をまとめてgenerateContentBatchへ渡し、結果を元の順序で返す（並列化）', () => {
    vi.mocked(geminiClient.generateContentBatch).mockReturnValue([
      '{"score":85,"feedback":"概ね正しい実装です"}',
      '{"score":40,"feedback":"不足があります"}',
    ]);

    const result = scoreDescriptiveAnswers([
      { question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' },
      { question: '問題2', sampleAnswer: '模範2', studentAnswer: '回答2' },
    ]);

    expect(geminiClient.generateContentBatch).toHaveBeenCalledTimes(1);
    const [prompts] = vi.mocked(geminiClient.generateContentBatch).mock.calls[0] ?? [[]];
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain('問題1');
    expect(prompts[1]).toContain('問題2');
    expect(result).toEqual([
      { score: 85, feedback: '概ね正しい実装です' },
      { score: 40, feedback: '不足があります' },
    ]);
  });

  test('未回答と回答済みが混在する場合、APIには回答済み分のみ渡し、結果は元のインデックスに正しく対応する', () => {
    vi.mocked(geminiClient.generateContentBatch).mockReturnValue(['{"score":70,"feedback":"やや不足"}']);

    const result = scoreDescriptiveAnswers([
      { question: '問題1', sampleAnswer: '模範1', studentAnswer: '' },
      { question: '問題2', sampleAnswer: '模範2', studentAnswer: '回答2' },
    ]);

    const [prompts] = vi.mocked(geminiClient.generateContentBatch).mock.calls[0] ?? [[]];
    expect(prompts).toHaveLength(1);
    expect(result).toEqual([
      { score: 0, feedback: '未回答のため0点としました。' },
      { score: 70, feedback: 'やや不足' },
    ]);
  });

  test('一部の呼び出しがErrorを返した場合、その項目のみ0点とし他の項目には影響しない', () => {
    vi.mocked(geminiClient.generateContentBatch).mockReturnValue([
      '{"score":90,"feedback":"良好"}',
      new Error('Gemini APIの呼び出しに失敗しました（status: 500）'),
    ]);

    const result = scoreDescriptiveAnswers([
      { question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' },
      { question: '問題2', sampleAnswer: '模範2', studentAnswer: '回答2' },
    ]);

    expect(result).toEqual([
      { score: 90, feedback: '良好' },
      { score: 0, feedback: '採点処理でエラーが発生したため0点としました。' },
    ]);
  });

  test('レスポンスがJSON形式・期待するプロパティを持たない場合は0点として扱う', () => {
    vi.mocked(geminiClient.generateContentBatch).mockReturnValue(['{"foo":"bar"}']);

    const result = scoreDescriptiveAnswers([{ question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' }]);

    expect(result[0]?.score).toBe(0);
  });

  test('Markdownのコードブロックで囲まれていても解析できる', () => {
    vi.mocked(geminiClient.generateContentBatch).mockReturnValue(['```json\n{"score":60,"feedback":"やや不足"}\n```']);

    const result = scoreDescriptiveAnswers([{ question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' }]);

    expect(result[0]).toEqual({ score: 60, feedback: 'やや不足' });
  });

  test('scoreが0〜100の範囲外の場合は範囲内に丸める', () => {
    vi.mocked(geminiClient.generateContentBatch).mockReturnValue(['{"score":150,"feedback":"満点超過"}']);

    const result = scoreDescriptiveAnswers([{ question: '問題1', sampleAnswer: '模範1', studentAnswer: '回答1' }]);

    expect(result[0]?.score).toBe(100);
  });

  test('全て未回答の場合はAPIを呼び出さない', () => {
    vi.mocked(geminiClient.generateContentBatch).mockReturnValue([]);

    const result = scoreDescriptiveAnswers([
      { question: '問題1', sampleAnswer: '模範1', studentAnswer: '' },
      { question: '問題2', sampleAnswer: '模範2', studentAnswer: '  ' },
    ]);

    expect(geminiClient.generateContentBatch).toHaveBeenCalledWith([]);
    expect(result).toEqual([
      { score: 0, feedback: '未回答のため0点としました。' },
      { score: 0, feedback: '未回答のため0点としました。' },
    ]);
  });
});
