import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ParsedExamResultRow } from '../../domain/models/exam_result_row';
import * as examResultQueryRepository from '../../repositories/exam_result_query_repository';
import * as viewerLogRepository from '../../repositories/viewer_log_repository';
import { getExamResultDetail } from '../get_exam_result_detail';

vi.mock('../../repositories/exam_result_query_repository');
vi.mock('../../repositories/viewer_log_repository');

const buildRow = (overrides: Partial<ParsedExamResultRow> = {}): ParsedExamResultRow => ({
  rowNumber: 5,
  recordedAt: new Date('2026-04-10T14:32:00'),
  roleLabel: '未経験の新入社員',
  name: '佐藤 美咲',
  employeeNumber: 'A123456',
  department: '開発部',
  overallCorrectRate: 999, // G〜K列由来ではなくM列から再集計されることを検証するため、あえて無関係な値にする
  durationText: '27分41秒（時間内に終了）',
  answerDetails: [
    { questionId: 'q1', category: 'コーディング', subCategory: 'if文', format: 'choice', answerContent: 'A', score: 100, isCorrect: true },
    {
      questionId: 'q2',
      category: 'SQL',
      subCategory: '集計',
      format: 'text',
      answerContent: '回答内容',
      score: 70,
      modelAnswer: '模範回答',
      feedback: 'やや不足',
    },
  ],
  ...overrides,
});

describe('getExamResultDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(viewerLogRepository.isAccessKeyValid).mockReturnValue(true);
    vi.mocked(examResultQueryRepository.findExamResultRowByRowNumber).mockReturnValue(buildRow());
  });

  test('Access Keyが不正な場合は「受験結果」シートへアクセスせず例外を投げる', () => {
    vi.mocked(viewerLogRepository.isAccessKeyValid).mockReturnValue(false);

    expect(() => getExamResultDetail('wrong-key', 5)).toThrow('VIEWER_ACCESS_KEY_INVALID');
    expect(examResultQueryRepository.findExamResultRowByRowNumber).not.toHaveBeenCalled();
  });

  test('該当行が存在しない場合は例外を投げる', () => {
    vi.mocked(examResultQueryRepository.findExamResultRowByRowNumber).mockReturnValue(null);

    expect(() => getExamResultDetail('secret-key', 999)).toThrow('受験結果が見つかりません');
  });

  test('総合正解率・区分別正解率をM列（回答詳細）から再集計して返す', () => {
    const result = getExamResultDetail('secret-key', 5);

    expect(result.overallCorrectRate).toBe(85); // (100 + 70) / 2、G〜K列由来のダミー値(999)は使われない
    expect(result.totalScore).toBe(170);
    expect(result.questionCount).toBe(2);
    expect(result.categoryScores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categoryName: 'コーディング', totalScore: 100 }),
        expect.objectContaining({ categoryName: 'SQL', totalScore: 70, descriptiveSubmittedCount: 1 }),
      ]),
    );
  });

  test('回答詳細・所要時間・受験者情報をそのまま返す', () => {
    const result = getExamResultDetail('secret-key', 5);

    expect(result.rowNumber).toBe(5);
    expect(result.name).toBe('佐藤 美咲');
    expect(result.durationText).toBe('27分41秒（時間内に終了）');
    expect(result.answerDetails).toHaveLength(2);
  });
});
