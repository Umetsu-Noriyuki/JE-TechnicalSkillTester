import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ParsedExamResultRow } from '../../domain/models/exam_result_row';
import * as examResultQueryRepository from '../../repositories/exam_result_query_repository';
import { getDescriptiveScoringResult } from '../get_descriptive_scoring_result';

vi.mock('../../repositories/exam_result_query_repository');

const buildRow = (overrides: Partial<ParsedExamResultRow> = {}): ParsedExamResultRow => ({
  rowNumber: 5,
  recordedAt: new Date('2026-04-10T14:32:00'),
  roleLabel: '未経験の新入社員',
  name: '佐藤 美咲',
  employeeNumber: 'A123456',
  department: '開発部',
  overallCorrectRate: 999, // M列から再集計されることを検証するため、あえて無関係な値にする
  durationText: '27分41秒（時間内に終了）',
  answerDetails: [
    {
      questionId: 'q1',
      category: 'コーディング',
      subCategory: 'if文',
      format: 'choice',
      questionText: '選択式の問題文',
      answerContent: 'A',
      score: 100,
      isCorrect: true,
      choices: [
        { text: 'A', isSelected: true, isCorrectChoice: true },
        { text: 'B', isSelected: false, isCorrectChoice: false },
      ],
    },
    {
      questionId: 'q2',
      category: 'SQL',
      subCategory: '集計',
      format: 'text',
      questionText: '記述式の問題文',
      answerContent: '回答内容',
      score: 70,
      modelAnswer: '模範回答',
      feedback: 'やや不足',
    },
  ],
  ...overrides,
});

describe('getDescriptiveScoringResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(examResultQueryRepository.findExamResultRowByRowNumber).mockReturnValue(buildRow());
  });

  test('「受験結果」シートM列の回答詳細をそのままanswerDetailsとして返す', () => {
    const result = getDescriptiveScoringResult(5);

    expect(result.answerDetails).toEqual(buildRow().answerDetails);
    expect(examResultQueryRepository.findExamResultRowByRowNumber).toHaveBeenCalledWith(5);
  });

  test('総合正解率・区分別正解率をM列（回答詳細）から再集計して返す（F〜K列由来のダミー値は使わない）', () => {
    const result = getDescriptiveScoringResult(5);

    expect(result.scoringResult.overallCorrectRate).toBe(85); // (100 + 70) / 2
    expect(result.scoringResult.totalScore).toBe(170);
    expect(result.scoringResult.questionCount).toBe(2);
    expect(result.scoringResult.categoryScores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categoryName: 'コーディング', totalScore: 100 }),
        expect.objectContaining({ categoryName: 'SQL', totalScore: 70, descriptiveSubmittedCount: 1 }),
      ]),
    );
  });

  test('該当行が存在しない場合は例外を投げる', () => {
    vi.mocked(examResultQueryRepository.findExamResultRowByRowNumber).mockReturnValue(null);

    expect(() => getDescriptiveScoringResult(999)).toThrow('受験結果が見つかりません');
  });
});
