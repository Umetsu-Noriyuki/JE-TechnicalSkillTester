import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { AnswerPayload } from '../../../shared/types/answer_payload';
import type { ScoringResult } from '../../../shared/types/scoring_result';
import * as answerDetailBuilder from '../../domain/services/answer_detail_builder';
import * as scorer from '../../domain/services/scorer';
import type { Question } from '../../domain/models/question';
import * as questionRepository from '../../repositories/question_repository';
import * as resultRepository from '../../repositories/result_repository';
import { submitResult } from '../submit_result';

vi.mock('../../repositories/question_repository');
vi.mock('../../repositories/result_repository');
vi.mock('../../domain/services/scorer');
vi.mock('../../domain/services/answer_detail_builder');

const sampleQuestion: Question = {
  id: 'q1',
  category: 'コーディング',
  subCategory: 'if文の条件式',
  format: 'choice',
  text: '問題文',
  choices: ['A', 'B', 'C', 'D'],
  correctChoiceNumber: 1,
};

const samplePayload: AnswerPayload = {
  examinee: { role: 'newhire', name: '山田太郎', employeeNumber: 'A1', department: '開発部' },
  answers: [{ questionId: 'q1', selectedChoiceNumber: 1 }],
  elapsedSeconds: 1000,
  isTimedOut: false,
};

const sampleScoringResult: ScoringResult = {
  overallCorrectRate: 100,
  choiceQuestionCount: 1,
  choiceCorrectCount: 1,
  categoryScores: [
    {
      categoryName: 'コーディング',
      choiceQuestionCount: 1,
      choiceCorrectCount: 1,
      correctRate: 100,
      descriptiveSubmittedCount: 0,
    },
  ],
};

const sampleAnswerDetails = [
  {
    questionId: 'q1',
    category: 'コーディング',
    subCategory: 'if文の条件式',
    format: 'choice' as const,
    answerContent: 'A',
    isCorrect: true,
  },
];

describe('submitResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(questionRepository.findAllQuestions).mockReturnValue([sampleQuestion]);
    vi.mocked(scorer.scoreExam).mockReturnValue(sampleScoringResult);
    vi.mocked(answerDetailBuilder.buildAnswerDetails).mockReturnValue(sampleAnswerDetails);
  });

  test('問題マスタ取得・採点・回答詳細生成・記録保存を順に実行し、採点結果を返す', () => {
    const result = submitResult(samplePayload);

    expect(questionRepository.findAllQuestions).toHaveBeenCalled();
    expect(scorer.scoreExam).toHaveBeenCalledWith([sampleQuestion], samplePayload.answers);
    expect(answerDetailBuilder.buildAnswerDetails).toHaveBeenCalledWith([sampleQuestion], samplePayload.answers);
    expect(resultRepository.appendExamResult).toHaveBeenCalledTimes(1);
    expect(result).toEqual(sampleScoringResult);
  });

  test('記録内容には受験者区分ラベル・氏名・所要時間・時間切れフラグ・回答詳細JSONが含まれる', () => {
    submitResult(samplePayload);

    const record = vi.mocked(resultRepository.appendExamResult).mock.calls[0]?.[0];
    expect(record).toMatchObject({
      roleLabel: '未経験の新入社員',
      name: '山田太郎',
      employeeNumber: 'A1',
      department: '開発部',
      overallCorrectRate: 100,
      elapsedSeconds: 1000,
      isTimedOut: false,
    });
    expect(record?.recordedAt).toBeInstanceOf(Date);
    expect(JSON.parse(record?.answerDetailsJson ?? '[]')).toEqual(sampleAnswerDetails);
  });

  test('入社希望者の場合、社員番号・所属は空文字として記録する', () => {
    submitResult({
      ...samplePayload,
      examinee: { role: 'applicant', name: '鈴木一郎' },
    });

    const record = vi.mocked(resultRepository.appendExamResult).mock.calls[0]?.[0];
    expect(record?.employeeNumber).toBe('');
    expect(record?.department).toBe('');
    expect(record?.roleLabel).toBe('入社希望者');
  });

  test('不正なroleの場合はエラーを投げ、記録処理を行わない', () => {
    const invalidPayload = {
      ...samplePayload,
      examinee: { ...samplePayload.examinee, role: 'hacker' },
    } as unknown as AnswerPayload;

    expect(() => submitResult(invalidPayload)).toThrow('不正な受験者区分');
    expect(resultRepository.appendExamResult).not.toHaveBeenCalled();
  });
});
