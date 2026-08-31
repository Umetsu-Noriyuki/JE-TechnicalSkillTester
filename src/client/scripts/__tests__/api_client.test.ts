import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { QuizQuestion } from '../../../shared/types/quiz_question';
import { fetchQuizQuestions } from '../api_client';

describe('fetchQuizQuestions', () => {
  const runner = {
    withSuccessHandler: vi.fn(),
    withFailureHandler: vi.fn(),
    getQuizQuestions: vi.fn(),
  };

  beforeEach(() => {
    runner.withSuccessHandler.mockReset().mockReturnValue(runner);
    runner.withFailureHandler.mockReset().mockReturnValue(runner);
    runner.getQuizQuestions.mockReset();

    (globalThis as { google?: unknown }).google = { script: { run: runner } };
  });

  test('成功時は取得した問題配列でPromiseを解決する', async () => {
    const questions: QuizQuestion[] = [{ id: 'q1', format: 'text', text: '問題文' }];

    const promise = fetchQuizQuestions('applicant');
    const successCallback = runner.withSuccessHandler.mock.calls[0][0] as (value: unknown) => void;
    successCallback(questions);

    await expect(promise).resolves.toEqual(questions);
    expect(runner.getQuizQuestions).toHaveBeenCalledWith('applicant');
  });

  test('失敗時はエラーでPromiseを拒否する', async () => {
    const promise = fetchQuizQuestions('applicant');
    const failureCallback = runner.withFailureHandler.mock.calls[0][0] as (error: Error) => void;
    failureCallback(new Error('server error'));

    await expect(promise).rejects.toThrow('server error');
  });
});
