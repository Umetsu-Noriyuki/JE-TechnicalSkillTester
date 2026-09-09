import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getRowValues, getSheetValues } from '../../infrastructure/spreadsheet_client';
import { findAllExamResultRows, findExamResultRowByRowNumber } from '../exam_result_query_repository';

vi.mock('../../infrastructure/spreadsheet_client', () => ({
  getSheetValues: vi.fn(),
  getRowValues: vi.fn(),
}));

const validRow = (overrides: { name?: string; answerDetailsJson?: string; overallCorrectRate?: unknown } = {}): unknown[] => [
  new Date('2026-04-10T14:32:00'),
  '未経験の新入社員',
  overrides.name ?? '佐藤 美咲',
  'A123456',
  '開発部',
  overrides.overallCorrectRate ?? 85,
  '75% (300/400点)',
  '-',
  '-',
  '-',
  '-',
  '27分41秒（時間内に終了）',
  overrides.answerDetailsJson ?? '[]',
];

describe('findAllExamResultRows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('ヘッダー行を除いた各データ行を、行番号付きで構造化して返す', () => {
    vi.mocked(getSheetValues).mockReturnValue([
      ['記録日時', '受験者区分', '氏名'],
      validRow({ name: '佐藤 美咲' }),
      validRow({ name: '鈴木 一郎' }),
    ]);

    const result = findAllExamResultRows();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ rowNumber: 2, name: '佐藤 美咲', employeeNumber: 'A123456', department: '開発部' });
    expect(result[1]).toMatchObject({ rowNumber: 3, name: '鈴木 一郎' });
  });

  test('空行（A列が日時でない行）は読み飛ばす', () => {
    vi.mocked(getSheetValues).mockReturnValue([['記録日時', '受験者区分', '氏名'], validRow(), []]);

    expect(findAllExamResultRows()).toHaveLength(1);
  });

  test('データ行が0件の場合は空配列を返す', () => {
    vi.mocked(getSheetValues).mockReturnValue([['記録日時', '受験者区分', '氏名']]);

    expect(findAllExamResultRows()).toEqual([]);
  });

  test('M列（回答詳細JSON）を正しくパースする', () => {
    vi.mocked(getSheetValues).mockReturnValue([
      ['記録日時', '受験者区分', '氏名'],
      validRow({
        answerDetailsJson: JSON.stringify([
          { questionId: 'q1', category: 'コーディング', subCategory: 'if文', format: 'choice', answerContent: 'A', score: 100, isCorrect: true },
        ]),
      }),
    ]);

    const result = findAllExamResultRows();

    expect(result[0]?.answerDetails).toEqual([
      { questionId: 'q1', category: 'コーディング', subCategory: 'if文', format: 'choice', answerContent: 'A', score: 100, isCorrect: true },
    ]);
  });

  test('M列がJSONとして解釈できない場合は例外を投げず空配列として扱う', () => {
    vi.mocked(getSheetValues).mockReturnValue([['記録日時', '受験者区分', '氏名'], validRow({ answerDetailsJson: '不正なJSON' })]);

    expect(findAllExamResultRows()[0]?.answerDetails).toEqual([]);
  });

  test('総合正解率（F列）が数値でない場合は0として扱う', () => {
    vi.mocked(getSheetValues).mockReturnValue([['記録日時', '受験者区分', '氏名'], validRow({ overallCorrectRate: '不正な値' })]);

    expect(findAllExamResultRows()[0]?.overallCorrectRate).toBe(0);
  });
});

describe('findExamResultRowByRowNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('指定した行番号のA〜M列を読み取り、構造化して返す', () => {
    vi.mocked(getRowValues).mockReturnValue(validRow({ name: '佐藤 美咲' }));

    const result = findExamResultRowByRowNumber(5);

    expect(getRowValues).toHaveBeenCalledWith('受験結果', 5, 1, 13);
    expect(result).toMatchObject({ rowNumber: 5, name: '佐藤 美咲' });
  });

  test('該当行が存在しない（空行）場合はnullを返す', () => {
    vi.mocked(getRowValues).mockReturnValue([]);

    expect(findExamResultRowByRowNumber(999)).toBeNull();
  });
});
