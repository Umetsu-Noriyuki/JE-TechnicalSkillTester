import { describe, expect, test } from 'vitest';
import type { ParsedExamResultRow } from '../../models/exam_result_row';
import { buildExamResultDetail } from '../exam_result_detail_builder';

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
    { questionId: 'q1', category: 'コーディング', subCategory: 'if文', format: 'choice', questionText: '問題1', answerContent: 'A', score: 100, isCorrect: true },
    {
      questionId: 'q2',
      category: 'SQL',
      subCategory: '集計',
      format: 'text',
      questionText: '問題2',
      answerContent: '回答内容',
      score: 70,
      modelAnswer: '模範回答',
      feedback: 'やや不足',
    },
  ],
  ...overrides,
});

describe('buildExamResultDetail', () => {
  test('総合正解率・区分別正解率をM列（回答詳細）から再集計する（F〜K列由来のダミー値は使わない）', () => {
    const result = buildExamResultDetail(buildRow());

    expect(result.overallCorrectRate).toBe(85); // (100 + 70) / 2
    expect(result.totalScore).toBe(170);
    expect(result.questionCount).toBe(2);
    expect(result.categoryScores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categoryName: 'コーディング', totalScore: 100 }),
        expect.objectContaining({ categoryName: 'SQL', totalScore: 70, descriptiveSubmittedCount: 1 }),
      ]),
    );
  });

  test('行番号・受験者情報・回答詳細・所要時間をそのまま返す', () => {
    const result = buildExamResultDetail(buildRow());

    expect(result.rowNumber).toBe(5);
    expect(result.name).toBe('佐藤 美咲');
    expect(result.employeeNumber).toBe('A123456');
    expect(result.department).toBe('開発部');
    expect(result.durationText).toBe('27分41秒（時間内に終了）');
    expect(result.answerDetails).toHaveLength(2);
  });

  test('記録日時をISO 8601形式の文字列へ変換する', () => {
    const result = buildExamResultDetail(buildRow());

    expect(result.recordedAt).toBe(new Date('2026-04-10T14:32:00').toISOString());
  });
});
