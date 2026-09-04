import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { AnswerPayload } from '../../../shared/types/answer_payload';
import type { QuizQuestion } from '../../../shared/types/quiz_question';
import type { ScoringResult } from '../../../shared/types/scoring_result';
import { fetchQuizQuestions, submitExamResult } from '../api_client';

const runner = {
  withSuccessHandler: vi.fn(),
  withFailureHandler: vi.fn(),
  getQuizQuestions: vi.fn(),
  submitResult: vi.fn(),
};

beforeEach(() => {
  runner.withSuccessHandler.mockReset().mockReturnValue(runner);
  runner.withFailureHandler.mockReset().mockReturnValue(runner);
  runner.getQuizQuestions.mockReset();
  runner.submitResult.mockReset();

  (globalThis as { google?: unknown }).google = { script: { run: runner } };
});

describe('fetchQuizQuestions', () => {
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

describe('submitExamResult', () => {
  const payload: AnswerPayload = {
    examinee: { role: 'applicant', name: '山田太郎' },
    answers: [],
    elapsedSeconds: 100,
    isTimedOut: false,
  };

  test('成功時は採点結果でPromiseを解決する', async () => {
    const scoringResult: ScoringResult = {
      overallCorrectRate: 80,
      questionCount: 5,
      totalScore: 400,
      categoryScores: [],
    };

    const promise = submitExamResult(payload);
    const successCallback = runner.withSuccessHandler.mock.calls[0][0] as (value: unknown) => void;
    successCallback(scoringResult);

    await expect(promise).resolves.toEqual(scoringResult);
    expect(runner.submitResult).toHaveBeenCalledWith(payload);
  });

  test('失敗時はエラーでPromiseを拒否する', async () => {
    const promise = submitExamResult(payload);
    const failureCallback = runner.withFailureHandler.mock.calls[0][0] as (error: Error) => void;
    failureCallback(new Error('submit error'));

    await expect(promise).rejects.toThrow('submit error');
  });
});
