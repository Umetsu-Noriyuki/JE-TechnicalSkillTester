import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { AnswerPayload } from '../../../shared/types/answer_payload';
import type { Question } from '../../domain/models/question';
import * as questionRepository from '../../repositories/question_repository';
import * as resultRepository from '../../repositories/result_repository';
import { normalizeProhibitedOperationCount, submitResult } from '../submit_result';

vi.mock('../../repositories/question_repository');
vi.mock('../../repositories/result_repository');

const choiceQuestion: Question = {
  id: 'q1',
  category: 'コーディング',
  subCategory: 'if文の条件式',
  format: 'choice',
  text: '選択式の問題文',
  choices: ['A', 'B', 'C', 'D'],
  correctChoiceNumber: 1,
};

const textQuestion: Question = {
  id: 'q2',
  category: 'SQL',
  subCategory: '集計',
  format: 'text',
  text: '記述式の問題文',
  modelAnswer: '模範回答',
};

const textQuestion2: Question = {
  id: 'q3',
  category: 'コーディング',
  subCategory: 'ロジック',
  format: 'text',
  text: '記述式の問題文2',
  modelAnswer: '模範回答2',
};

const buildPayload = (overrides: Partial<AnswerPayload> = {}): AnswerPayload => ({
  examinee: { role: 'newhire', name: '山田太郎', employeeNumber: 'A1', department: '開発部' },
  answers: [
    { questionId: 'q1', selectedChoiceNumber: 1 },
    { questionId: 'q2', descriptiveAnswer: '回答内容' },
  ],
  elapsedSeconds: 1000,
  isTimedOut: false,
  prohibitedOperationCount: 0,
  ...overrides,
});

describe('submitResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(questionRepository.findAllQuestions).mockReturnValue([choiceQuestion, textQuestion, textQuestion2]);
    vi.mocked(resultRepository.appendExamResult).mockReturnValue(5);
  });

  test('選択式のみを集計した暫定の採点結果と、追記した行番号（resultId）を返す。Geminiは呼び出さない', () => {
    const result = submitResult(buildPayload());

    expect(result.resultId).toBe(5);
    expect(result.scoringResult.questionCount).toBe(1);
    expect(result.scoringResult.totalScore).toBe(100);
    expect(result.scoringResult.overallCorrectRate).toBe(100);
  });

  test('記述式問題は「採点中」として記録し、記述式採点列（descriptiveScoreCells）は\'pending\'にする', () => {
    submitResult(buildPayload());

    const record = vi.mocked(resultRepository.appendExamResult).mock.calls[0]?.[0];
    expect(record?.descriptiveScoreCells).toEqual(['pending']);

    const details = JSON.parse(record?.answerDetailsJson ?? '[]');
    expect(details).toEqual([
      {
        questionId: 'q1',
        category: 'コーディング',
        subCategory: 'if文の条件式',
        format: 'choice',
        questionText: '選択式の問題文',
        answerContent: 'A',
        score: 100,
        isCorrect: true,
        choices: [
          { text: 'A', isSelected: true, isCorrectChoice: true },
          { text: 'B', isSelected: false, isCorrectChoice: false },
          { text: 'C', isSelected: false, isCorrectChoice: false },
          { text: 'D', isSelected: false, isCorrectChoice: false },
        ],
      },
      {
        questionId: 'q2',
        category: 'SQL',
        subCategory: '集計',
        format: 'text',
        questionText: '記述式の問題文',
        answerContent: '回答内容',
        score: 0,
        modelAnswer: '模範回答',
        feedback: '採点中',
      },
    ]);
  });

  test('複数の記述式問題がある場合、それぞれpendingとして記録する', () => {
    submitResult(
      buildPayload({
        answers: [
          { questionId: 'q1', selectedChoiceNumber: 1 },
          { questionId: 'q2', descriptiveAnswer: '回答1' },
          { questionId: 'q3', descriptiveAnswer: '回答2' },
        ],
      }),
    );

    const record = vi.mocked(resultRepository.appendExamResult).mock.calls[0]?.[0];
    expect(record?.descriptiveScoreCells).toEqual(['pending', 'pending']);
  });

  test('問題マスタに存在しないquestionIdの回答は無視する', () => {
    const result = submitResult(
      buildPayload({ answers: [{ questionId: 'q1', selectedChoiceNumber: 1 }, { questionId: 'unknown' }] }),
    );

    expect(result.scoringResult.questionCount).toBe(1);
  });

  test('不正なroleの場合はエラーを投げ、記録処理を行わない', () => {
    const invalidPayload = {
      ...buildPayload(),
      examinee: { ...buildPayload().examinee, role: 'hacker' },
    } as unknown as AnswerPayload;

    expect(() => submitResult(invalidPayload)).toThrow('不正な受験者区分');
    expect(resultRepository.appendExamResult).not.toHaveBeenCalled();
  });

  test('入社希望者の場合、社員番号・所属は空文字として記録する', () => {
    submitResult(buildPayload({ examinee: { role: 'applicant', name: '鈴木一郎' } }));

    const record = vi.mocked(resultRepository.appendExamResult).mock.calls[0]?.[0];
    expect(record?.employeeNumber).toBe('');
    expect(record?.department).toBe('');
    expect(record?.roleLabel).toBe('入社希望者');
  });

  test('【正常系】禁止操作回数をそのまま受験結果に記録する', () => {
    submitResult(buildPayload({ prohibitedOperationCount: 5 }));

    const record = vi.mocked(resultRepository.appendExamResult).mock.calls[0]?.[0];
    expect(record?.prohibitedOperationCount).toBe(5);
  });

  test('【異常系】禁止操作回数が不正な値の場合は0として記録し、記録処理は継続する', () => {
    submitResult(buildPayload({ prohibitedOperationCount: -3 }));

    const record = vi.mocked(resultRepository.appendExamResult).mock.calls[0]?.[0];
    expect(record?.prohibitedOperationCount).toBe(0);
    expect(resultRepository.appendExamResult).toHaveBeenCalledTimes(1);
  });
});

describe('normalizeProhibitedOperationCount', () => {
  test.each([
    [0, 0],
    [1, 1],
    [42, 42],
  ])('【正常系】0以上の整数 %d はそのまま %d を返す', (input, expected) => {
    expect(normalizeProhibitedOperationCount(input)).toBe(expected);
  });

  test.each([
    ['未送信（undefined）', undefined],
    ['負の数', -1],
    ['小数', 1.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('【異常系】%sの場合は0を返す', (_label, input) => {
    expect(normalizeProhibitedOperationCount(input)).toBe(0);
  });

  test('【異常系】数値以外（文字列）が送信された場合は0を返す', () => {
    const tamperedValue = '3' as unknown as number;

    expect(normalizeProhibitedOperationCount(tamperedValue)).toBe(0);
  });
});
