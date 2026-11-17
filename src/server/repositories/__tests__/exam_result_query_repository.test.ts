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

/** U列（禁止操作回数）まで値を持つ行。N〜T列（記述式採点）は空欄とする。 */
const EMPTY_DESCRIPTIVE_SCORE_CELLS = ['', '', '', '', '', '', ''];
const rowWithProhibitedOperationCount = (count: unknown): unknown[] => [
  ...validRow(),
  ...EMPTY_DESCRIPTIVE_SCORE_CELLS,
  count,
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

  test('社員番号（D列）が数字のみの場合、スプレッドシート側で数値型として認識されていても文字列として読み取る', () => {
    const row = validRow();
    row[3] = 123456; // Googleスプレッドシートが数値セルとして自動認識したケースを再現

    vi.mocked(getSheetValues).mockReturnValue([['記録日時', '受験者区分', '氏名'], row]);

    expect(findAllExamResultRows()[0]?.employeeNumber).toBe('123456');
  });

  test('【正常系】U列の禁止操作回数を数値として読み取る', () => {
    vi.mocked(getSheetValues).mockReturnValue([
      ['記録日時', '受験者区分', '氏名'],
      rowWithProhibitedOperationCount(4),
    ]);

    expect(findAllExamResultRows()[0]?.prohibitedOperationCount).toBe(4);
  });

  test('【正常系】U列が存在しない（U列追加前に記録された）行は禁止操作回数を0として扱う', () => {
    vi.mocked(getSheetValues).mockReturnValue([['記録日時', '受験者区分', '氏名'], validRow()]);

    expect(findAllExamResultRows()[0]?.prohibitedOperationCount).toBe(0);
  });

  test.each([
    ['空欄', ''],
    ['文字列', '3回'],
    ['負の数', -1],
    ['小数', 1.5],
  ])('【異常系】U列が%sの場合は禁止操作回数を0として扱う', (_label, value) => {
    vi.mocked(getSheetValues).mockReturnValue([
      ['記録日時', '受験者区分', '氏名'],
      rowWithProhibitedOperationCount(value),
    ]);

    expect(findAllExamResultRows()[0]?.prohibitedOperationCount).toBe(0);
  });
});

describe('findExamResultRowByRowNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('指定した行番号のA〜U列を読み取り、構造化して返す', () => {
    vi.mocked(getRowValues).mockReturnValue(rowWithProhibitedOperationCount(2));

    const result = findExamResultRowByRowNumber(5);

    expect(getRowValues).toHaveBeenCalledWith('受験結果', 5, 1, 21);
    expect(result).toMatchObject({ rowNumber: 5, name: '佐藤 美咲', prohibitedOperationCount: 2 });
  });

  test('該当行が存在しない（空行）場合はnullを返す', () => {
    vi.mocked(getRowValues).mockReturnValue([]);

    expect(findExamResultRowByRowNumber(999)).toBeNull();
  });
});
