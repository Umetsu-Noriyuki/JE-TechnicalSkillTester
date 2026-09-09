import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { AnswerPayload } from '../../../shared/types/answer_payload';
import type { Question } from '../../domain/models/question';
import * as questionRepository from '../../repositories/question_repository';
import * as resultRepository from '../../repositories/result_repository';
import { getDescriptiveScoringResult } from '../get_descriptive_scoring_result';

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

describe('getDescriptiveScoringResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(questionRepository.findAllQuestions).mockReturnValue([choiceQuestion, textQuestion]);
    vi.mocked(resultRepository.readDescriptiveScoreCells).mockReturnValue([
      { questionId: 'q2', studentAnswer: '回答内容', score: 70, referenceAnswer: '模範回答', feedback: 'やや不足' },
    ]);
  });

  test('記述式採点列（N〜T列）から読み取った内容をitemsとして返す', () => {
    const result = getDescriptiveScoringResult(5, buildPayload());

    expect(result.items).toEqual([
      { questionId: 'q2', studentAnswer: '回答内容', score: 70, referenceAnswer: '模範回答', feedback: 'やや不足' },
    ]);
    expect(resultRepository.readDescriptiveScoreCells).toHaveBeenCalledWith(5);
  });

  test('選択式を再採点し、記述式と合わせた最終的な採点結果を返す', () => {
    const result = getDescriptiveScoringResult(5, buildPayload());

    expect(result.scoringResult.questionCount).toBe(2);
    expect(result.scoringResult.totalScore).toBe(170); // 選択式100点 + 記述式70点
    expect(result.scoringResult.overallCorrectRate).toBe(85);
  });

  test('採点済みであるべき枠がnullの場合はエラーを投げる', () => {
    vi.mocked(resultRepository.readDescriptiveScoreCells).mockReturnValue([null]);

    expect(() => getDescriptiveScoringResult(5, buildPayload())).toThrow('記述式の採点結果が見つかりません');
  });
});
