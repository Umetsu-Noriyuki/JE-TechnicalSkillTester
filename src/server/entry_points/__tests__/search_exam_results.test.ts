import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ParsedExamResultRow } from '../../domain/models/exam_result_row';
import * as examResultQueryRepository from '../../repositories/exam_result_query_repository';
import * as viewerLogRepository from '../../repositories/viewer_log_repository';
import { searchExamResults } from '../search_exam_results';

vi.mock('../../repositories/exam_result_query_repository');
vi.mock('../../repositories/viewer_log_repository');

const buildRow = (overrides: Partial<ParsedExamResultRow> = {}): ParsedExamResultRow => ({
  rowNumber: 2,
  recordedAt: new Date('2026-04-10T14:32:00'),
  roleLabel: '未経験の新入社員',
  name: '佐藤 美咲',
  employeeNumber: 'A123456',
  department: '開発部',
  overallCorrectRate: 85,
  durationText: '27分41秒（時間内に終了）',
  answerDetails: [],
  ...overrides,
});

describe('searchExamResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(viewerLogRepository.isAccessKeyValid).mockReturnValue(true);
    vi.mocked(examResultQueryRepository.findAllExamResultRows).mockReturnValue([buildRow()]);
  });

  test('Access Keyが不正な場合は「受験結果」シートへアクセスせず例外を投げる', () => {
    vi.mocked(viewerLogRepository.isAccessKeyValid).mockReturnValue(false);

    expect(() => searchExamResults('wrong-key', {})).toThrow('VIEWER_ACCESS_KEY_INVALID');
    expect(examResultQueryRepository.findAllExamResultRows).not.toHaveBeenCalled();
  });

  test('絞り込んだ結果を、一覧表示に必要な要約情報（ExamResultSummary）へ変換して返す', () => {
    const result = searchExamResults('secret-key', {});

    expect(result).toEqual([
      {
        rowNumber: 2,
        recordedAt: new Date('2026-04-10T14:32:00').toISOString(),
        roleLabel: '未経験の新入社員',
        name: '佐藤 美咲',
        employeeNumber: 'A123456',
        department: '開発部',
        overallCorrectRate: 85,
      },
    ]);
  });

  test('検索条件で絞り込んだうえで返す', () => {
    vi.mocked(examResultQueryRepository.findAllExamResultRows).mockReturnValue([
      buildRow({ rowNumber: 2, name: '佐藤 美咲' }),
      buildRow({ rowNumber: 3, name: '鈴木 一郎' }),
    ]);

    const result = searchExamResults('secret-key', { name: '佐藤' });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('佐藤 美咲');
  });

  test('該当なしの場合は空配列を返す', () => {
    vi.mocked(examResultQueryRepository.findAllExamResultRows).mockReturnValue([]);

    expect(searchExamResults('secret-key', {})).toEqual([]);
  });
});
