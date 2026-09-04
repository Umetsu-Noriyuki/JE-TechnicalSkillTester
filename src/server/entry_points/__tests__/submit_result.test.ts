import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { AnswerPayload } from '../../../shared/types/answer_payload';
import * as descriptiveScorer from '../../domain/services/descriptive_scorer';
import type { Question } from '../../domain/models/question';
import * as questionRepository from '../../repositories/question_repository';
import * as resultRepository from '../../repositories/result_repository';
import { submitResult } from '../submit_result';

vi.mock('../../repositories/question_repository');
vi.mock('../../repositories/result_repository');
vi.mock('../../domain/services/descriptive_scorer');

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

const buildPayload = (overrides: Partial<AnswerPayload> = {}): AnswerPayload => ({
  examinee: { role: 'newhire', name: '山田太郎', employeeNumber: 'A1', department: '開発部' },
  answers: [
    { questionId: 'q1', selectedChoiceNumber: 1 },
    { questionId: 'q2', descriptiveAnswer: '回答内容' },
  ],
  elapsedSeconds: 1000,
  isTimedOut: false,
  ...overrides,
});

describe('submitResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(questionRepository.findAllQuestions).mockReturnValue([choiceQuestion, textQuestion]);
    vi.mocked(descriptiveScorer.scoreDescriptiveAnswer).mockReturnValue({ score: 70, feedback: 'やや不足があります' });
  });

  test('選択式は正誤判定、記述式はGemini採点結果で採点し、集計結果を返す', () => {
    const result = submitResult(buildPayload());

    expect(descriptiveScorer.scoreDescriptiveAnswer).toHaveBeenCalledWith('記述式の問題文', '模範回答', '回答内容');
    expect(result.questionCount).toBe(2);
    expect(result.totalScore).toBe(170); // 選択式100点 + 記述式70点
    expect(result.overallCorrectRate).toBe(85);
  });

  test('記録内容の回答詳細（M列相当）に選択式・記述式それぞれの得点が含まれる', () => {
    submitResult(buildPayload());

    const record = vi.mocked(resultRepository.appendExamResult).mock.calls[0]?.[0];
    const details = JSON.parse(record?.answerDetailsJson ?? '[]');

    expect(details).toEqual([
      {
        questionId: 'q1',
        category: 'コーディング',
        subCategory: 'if文の条件式',
        format: 'choice',
        answerContent: 'A',
        score: 100,
        isCorrect: true,
      },
      {
        questionId: 'q2',
        category: 'SQL',
        subCategory: '集計',
        format: 'text',
        answerContent: '回答内容',
        score: 70,
        modelAnswer: '模範回答',
        feedback: 'やや不足があります',
      },
    ]);
  });

  test('問題マスタに存在しないquestionIdの回答は無視する', () => {
    const result = submitResult(
      buildPayload({ answers: [{ questionId: 'q1', selectedChoiceNumber: 1 }, { questionId: 'unknown' }] }),
    );

    expect(result.questionCount).toBe(1);
  });

  test('不正なroleの場合はエラーを投げ、記録処理を行わない', () => {
    const invalidPayload = {
      ...buildPayload(),
      examinee: { ...buildPayload().examinee, role: 'hacker' },
    } as unknown as AnswerPayload;

    expect(() => submitResult(invalidPayload)).toThrow('不正な受験者区分');
    expect(resultRepository.appendExamResult).not.toHaveBeenCalled();
    expect(descriptiveScorer.scoreDescriptiveAnswer).not.toHaveBeenCalled();
  });

  test('入社希望者の場合、社員番号・所属は空文字として記録する', () => {
    submitResult(buildPayload({ examinee: { role: 'applicant', name: '鈴木一郎' } }));

    const record = vi.mocked(resultRepository.appendExamResult).mock.calls[0]?.[0];
    expect(record?.employeeNumber).toBe('');
    expect(record?.department).toBe('');
    expect(record?.roleLabel).toBe('入社希望者');
  });
});
