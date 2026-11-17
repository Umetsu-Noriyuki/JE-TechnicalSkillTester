import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DescriptiveScoreCell, ExamResultRecord } from '../../domain/models/exam_result_record';
import { withLock } from '../../infrastructure/lock_service_client';
import { appendSheetRow, getRowValues, setRowValues } from '../../infrastructure/spreadsheet_client';
import { appendExamResult, isDescriptiveScoringPending, updateExamResultAfterDescriptiveScoring } from '../result_repository';

vi.mock('../../infrastructure/spreadsheet_client', () => ({
  appendSheetRow: vi.fn(),
  getRowValues: vi.fn(),
  setRowValues: vi.fn(),
}));

vi.mock('../../infrastructure/lock_service_client', () => ({
  withLock: vi.fn((fn: () => unknown) => fn()),
}));

const buildRecord = (overrides: Partial<ExamResultRecord> = {}): ExamResultRecord => ({
  recordedAt: new Date('2026-04-10T14:32:00+09:00'),
  roleLabel: '未経験の新入社員',
  name: '佐藤 美咲',
  employeeNumber: 'A123456',
  department: '開発部',
  overallCorrectRate: 63,
  categoryScores: [
    { categoryName: 'コーディング', questionCount: 4, totalScore: 300, correctRate: 75, descriptiveSubmittedCount: 2 },
    { categoryName: 'SQL', questionCount: 4, totalScore: 200, correctRate: 50, descriptiveSubmittedCount: 2 },
  ],
  elapsedSeconds: 1661,
  isTimedOut: false,
  answerDetailsJson: '[{"questionId":"q1"}]',
  descriptiveScoreCells: ['pending', 'pending'],
  prohibitedOperationCount: 3,
  ...overrides,
});

describe('appendExamResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(appendSheetRow).mockReturnValue(5);
  });

  test('ロックを取得したうえで「受験結果」シートへA〜U列の順で1行追記し、追記した行番号を返す', () => {
    const record = buildRecord();

    const resultId = appendExamResult(record);

    expect(withLock).toHaveBeenCalled();
    expect(appendSheetRow).toHaveBeenCalledWith('受験結果', [
      record.recordedAt,
      '未経験の新入社員',
      '佐藤 美咲',
      'A123456',
      '開発部',
      63,
      '75% (300/400点)',
      '50% (200/400点)',
      '-',
      '-',
      '-',
      '27分41秒（時間内に終了）',
      '[{"questionId":"q1"}]',
      '採点中',
      '採点中',
      '',
      '',
      '',
      '',
      '',
      3,
    ]);
    expect(resultId).toBe(5);
  });

  test('【正常系】禁止操作回数をU列（21列目）に記録する', () => {
    appendExamResult(buildRecord({ prohibitedOperationCount: 7 }));

    const [, row] = vi.mocked(appendSheetRow).mock.calls[0] ?? [];
    expect(row).toHaveLength(21);
    expect(row?.[20]).toBe(7);
  });

  test('【正常系】禁止操作が0回の場合はU列に0を記録する', () => {
    appendExamResult(buildRecord({ prohibitedOperationCount: 0 }));

    const [, row] = vi.mocked(appendSheetRow).mock.calls[0] ?? [];
    expect(row?.[20]).toBe(0);
  });

  test('入社希望者は社員番号・所属を空文字として記録する', () => {
    const record = buildRecord({ roleLabel: '入社希望者', employeeNumber: '', department: '' });

    appendExamResult(record);

    const [, row] = vi.mocked(appendSheetRow).mock.calls[0] ?? [];
    expect(row?.[1]).toBe('入社希望者');
    expect(row?.[3]).toBe('');
    expect(row?.[4]).toBe('');
  });

  test('時間切れの場合は所要時間セルに「時間切れ」と記録する', () => {
    const record = buildRecord({ elapsedSeconds: 1800, isTimedOut: true });

    appendExamResult(record);

    const [, row] = vi.mocked(appendSheetRow).mock.calls[0] ?? [];
    expect(row?.[11]).toBe('30分0秒（時間切れ）');
  });

  test('記述式問題が0問の場合、N〜T列は全て空文字になる', () => {
    const record = buildRecord({ descriptiveScoreCells: [] });

    appendExamResult(record);

    const [, row] = vi.mocked(appendSheetRow).mock.calls[0] ?? [];
    expect(row?.slice(12)).toEqual(['[{"questionId":"q1"}]', '', '', '', '', '', '', '', 3]);
  });
});

describe('updateExamResultAfterDescriptiveScoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('ロックを取得したうえでF〜K列（総合・区分別正解率）とM〜T列（回答詳細・記述式採点結果）を上書きする', () => {
    const cells: DescriptiveScoreCell[] = [
      { questionId: 'q2', questionText: '記述式の問題文', studentAnswer: '回答内容', score: 70, referenceAnswer: '模範回答', feedback: 'やや不足' },
    ];

    updateExamResultAfterDescriptiveScoring(5, {
      overallCorrectRate: 85,
      categoryScores: [
        { categoryName: 'コーディング', questionCount: 1, totalScore: 100, correctRate: 100, descriptiveSubmittedCount: 0 },
      ],
      answerDetailsJson: '[{"questionId":"q1"},{"questionId":"q2"}]',
      descriptiveScoreCells: cells,
    });

    expect(withLock).toHaveBeenCalled();
    expect(setRowValues).toHaveBeenCalledWith('受験結果', 5, 6, [85, '100% (100/100点)', '-', '-', '-', '-']);
    expect(setRowValues).toHaveBeenCalledWith('受験結果', 5, 13, [
      '[{"questionId":"q1"},{"questionId":"q2"}]',
      JSON.stringify(cells[0]),
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  });

  test('【正常系】U列（禁止操作回数）は上書きしない（書き込み範囲がT列までに収まる）', () => {
    updateExamResultAfterDescriptiveScoring(5, {
      overallCorrectRate: 85,
      categoryScores: [],
      answerDetailsJson: '[]',
      descriptiveScoreCells: [],
    });

    for (const [, , startColumn, values] of vi.mocked(setRowValues).mock.calls) {
      const lastColumn = startColumn + values.length - 1;
      expect(lastColumn).toBeLessThanOrEqual(20);
    }
  });
});

describe('isDescriptiveScoringPending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('N〜T列のいずれかに採点中マーカーが残っていればtrue', () => {
    vi.mocked(getRowValues).mockReturnValue(['採点中', '', '', '', '', '', '']);

    expect(isDescriptiveScoringPending(5)).toBe(true);
    expect(getRowValues).toHaveBeenCalledWith('受験結果', 5, 14, 7);
  });

  test('採点中マーカーが残っていなければfalse', () => {
    vi.mocked(getRowValues).mockReturnValue(['{"score":80}', '', '', '', '', '', '']);

    expect(isDescriptiveScoringPending(5)).toBe(false);
  });
});
