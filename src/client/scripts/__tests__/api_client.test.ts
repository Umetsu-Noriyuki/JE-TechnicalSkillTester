import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { AnswerPayload } from '../../../shared/types/answer_payload';
import type { DescriptiveScoringResult } from '../../../shared/types/descriptive_scoring';
import type { ExamResultDetail } from '../../../shared/types/exam_result_detail';
import type { ExamResultSummary } from '../../../shared/types/exam_result_search';
import type { QuizQuestion } from '../../../shared/types/quiz_question';
import type { SubmitResultResponse } from '../../../shared/types/submit_result_response';
import {
  fetchDescriptiveScoringResult,
  fetchDescriptiveScoringStatus,
  fetchExamResultDetail,
  fetchQuizQuestions,
  searchExamResults,
  startDescriptiveScoring,
  submitExamResult,
  verifyViewerAccessKey,
} from '../api_client';

const runner = {
  withSuccessHandler: vi.fn(),
  withFailureHandler: vi.fn(),
  getQuizQuestions: vi.fn(),
  submitResult: vi.fn(),
  scoreDescriptiveQuestions: vi.fn(),
  getDescriptiveScoringStatus: vi.fn(),
  getDescriptiveScoringResult: vi.fn(),
  verifyViewerAccessKey: vi.fn(),
  searchExamResults: vi.fn(),
  getExamResultDetail: vi.fn(),
};

beforeEach(() => {
  runner.withSuccessHandler.mockReset().mockReturnValue(runner);
  runner.withFailureHandler.mockReset().mockReturnValue(runner);
  runner.getQuizQuestions.mockReset();
  runner.submitResult.mockReset();
  runner.scoreDescriptiveQuestions.mockReset();
  runner.getDescriptiveScoringStatus.mockReset();
  runner.getDescriptiveScoringResult.mockReset();
  runner.verifyViewerAccessKey.mockReset();
  runner.searchExamResults.mockReset();
  runner.getExamResultDetail.mockReset();

  (globalThis as { google?: unknown }).google = { script: { run: runner } };
});

describe('fetchQuizQuestions', () => {
  test('成功時は取得した問題配列でPromiseを解決する', async () => {
    const questions: QuizQuestion[] = [{ id: 'q1', format: 'text', text: '問題文' }];

    const promise = fetchQuizQuestions('applicant', '山田太郎');
    const successCallback = runner.withSuccessHandler.mock.calls[0][0] as (value: unknown) => void;
    successCallback(questions);

    await expect(promise).resolves.toEqual(questions);
    expect(runner.getQuizQuestions).toHaveBeenCalledWith('applicant', '山田太郎');
  });

  test('失敗時はエラーでPromiseを拒否する', async () => {
    const promise = fetchQuizQuestions('applicant', '山田太郎');
    const failureCallback = runner.withFailureHandler.mock.calls[0][0] as (error: Error) => void;
    failureCallback(new Error('server error'));

    await expect(promise).rejects.toThrow('server error');
  });
});

const payload: AnswerPayload = {
  examinee: { role: 'applicant', name: '山田太郎' },
  answers: [],
  elapsedSeconds: 100,
  isTimedOut: false,
};

describe('submitExamResult', () => {
  test('成功時はresultIdと暫定の採点結果でPromiseを解決する', async () => {
    const response: SubmitResultResponse = {
      resultId: 5,
      scoringResult: { overallCorrectRate: 80, questionCount: 5, totalScore: 400, categoryScores: [] },
    };

    const promise = submitExamResult(payload);
    const successCallback = runner.withSuccessHandler.mock.calls[0][0] as (value: unknown) => void;
    successCallback(response);

    await expect(promise).resolves.toEqual(response);
    expect(runner.submitResult).toHaveBeenCalledWith(payload);
  });

  test('失敗時はエラーでPromiseを拒否する', async () => {
    const promise = submitExamResult(payload);
    const failureCallback = runner.withFailureHandler.mock.calls[0][0] as (error: Error) => void;
    failureCallback(new Error('submit error'));

    await expect(promise).rejects.toThrow('submit error');
  });
});

describe('startDescriptiveScoring', () => {
  test('成功時はresultId・payloadを渡してPromiseを解決する', async () => {
    const promise = startDescriptiveScoring(5, payload);
    const successCallback = runner.withSuccessHandler.mock.calls[0][0] as (value: unknown) => void;
    successCallback(undefined);

    await expect(promise).resolves.toBeUndefined();
    expect(runner.scoreDescriptiveQuestions).toHaveBeenCalledWith(5, payload);
  });

  test('失敗時はエラーでPromiseを拒否する', async () => {
    const promise = startDescriptiveScoring(5, payload);
    const failureCallback = runner.withFailureHandler.mock.calls[0][0] as (error: Error) => void;
    failureCallback(new Error('background error'));

    await expect(promise).rejects.toThrow('background error');
  });
});

describe('fetchDescriptiveScoringStatus', () => {
  test('成功時はpending/completedでPromiseを解決する', async () => {
    const promise = fetchDescriptiveScoringStatus(5);
    const successCallback = runner.withSuccessHandler.mock.calls[0][0] as (value: unknown) => void;
    successCallback('pending');

    await expect(promise).resolves.toBe('pending');
    expect(runner.getDescriptiveScoringStatus).toHaveBeenCalledWith(5);
  });
});

describe('fetchDescriptiveScoringResult', () => {
  test('成功時は記述式の最終結果でPromiseを解決する', async () => {
    const result: DescriptiveScoringResult = {
      items: [{ questionId: 'q2', studentAnswer: '回答', score: 70, referenceAnswer: '模範', feedback: 'FB' }],
      scoringResult: { overallCorrectRate: 85, questionCount: 2, totalScore: 170, categoryScores: [] },
    };

    const promise = fetchDescriptiveScoringResult(5, payload);
    const successCallback = runner.withSuccessHandler.mock.calls[0][0] as (value: unknown) => void;
    successCallback(result);

    await expect(promise).resolves.toEqual(result);
    expect(runner.getDescriptiveScoringResult).toHaveBeenCalledWith(5, payload);
  });

  test('失敗時はエラーでPromiseを拒否する', async () => {
    const promise = fetchDescriptiveScoringResult(5, payload);
    const failureCallback = runner.withFailureHandler.mock.calls[0][0] as (error: Error) => void;
    failureCallback(new Error('fetch error'));

    await expect(promise).rejects.toThrow('fetch error');
  });
});

describe('verifyViewerAccessKey', () => {
  test('成功時はboolean（一致するか）でPromiseを解決する', async () => {
    const promise = verifyViewerAccessKey(4, 'secret-key');
    const successCallback = runner.withSuccessHandler.mock.calls[0][0] as (value: unknown) => void;
    successCallback(true);

    await expect(promise).resolves.toBe(true);
    expect(runner.verifyViewerAccessKey).toHaveBeenCalledWith(4, 'secret-key');
  });

  test('失敗時はエラーでPromiseを拒否する', async () => {
    const promise = verifyViewerAccessKey(4, 'secret-key');
    const failureCallback = runner.withFailureHandler.mock.calls[0][0] as (error: Error) => void;
    failureCallback(new Error('verify error'));

    await expect(promise).rejects.toThrow('verify error');
  });
});

describe('searchExamResults', () => {
  test('成功時は検索結果一覧でPromiseを解決する', async () => {
    const results: ExamResultSummary[] = [
      {
        rowNumber: 2,
        recordedAt: '2026-04-10T05:32:00.000Z',
        roleLabel: '未経験の新入社員',
        name: '佐藤 美咲',
        employeeNumber: 'A123456',
        department: '開発部',
        overallCorrectRate: 85,
      },
    ];

    const promise = searchExamResults('secret-key', { name: '佐藤' });
    const successCallback = runner.withSuccessHandler.mock.calls[0][0] as (value: unknown) => void;
    successCallback(results);

    await expect(promise).resolves.toEqual(results);
    expect(runner.searchExamResults).toHaveBeenCalledWith('secret-key', { name: '佐藤' });
  });

  test('失敗時はエラーでPromiseを拒否する', async () => {
    const promise = searchExamResults('secret-key', {});
    const failureCallback = runner.withFailureHandler.mock.calls[0][0] as (error: Error) => void;
    failureCallback(new Error('search error'));

    await expect(promise).rejects.toThrow('search error');
  });
});

describe('fetchExamResultDetail', () => {
  test('成功時は選択した受験結果の詳細でPromiseを解決する', async () => {
    const detail: ExamResultDetail = {
      rowNumber: 2,
      recordedAt: '2026-04-10T05:32:00.000Z',
      roleLabel: '未経験の新入社員',
      name: '佐藤 美咲',
      employeeNumber: 'A123456',
      department: '開発部',
      overallCorrectRate: 85,
      durationText: '27分41秒（時間内に終了）',
      categoryScores: [],
      totalScore: 170,
      questionCount: 2,
      answerDetails: [],
    };

    const promise = fetchExamResultDetail('secret-key', 2);
    const successCallback = runner.withSuccessHandler.mock.calls[0][0] as (value: unknown) => void;
    successCallback(detail);

    await expect(promise).resolves.toEqual(detail);
    expect(runner.getExamResultDetail).toHaveBeenCalledWith('secret-key', 2);
  });

  test('失敗時はエラーでPromiseを拒否する', async () => {
    const promise = fetchExamResultDetail('secret-key', 2);
    const failureCallback = runner.withFailureHandler.mock.calls[0][0] as (error: Error) => void;
    failureCallback(new Error('detail error'));

    await expect(promise).rejects.toThrow('detail error');
  });
});
