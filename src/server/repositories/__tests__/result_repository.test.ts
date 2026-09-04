import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ExamResultRecord } from '../../domain/models/exam_result_record';
import { withLock } from '../../infrastructure/lock_service_client';
import { appendSheetRow } from '../../infrastructure/spreadsheet_client';
import { appendExamResult } from '../result_repository';

vi.mock('../../infrastructure/spreadsheet_client', () => ({
  appendSheetRow: vi.fn(),
}));

vi.mock('../../infrastructure/lock_service_client', () => ({
  withLock: vi.fn((fn: () => void) => fn()),
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
  ...overrides,
});

describe('appendExamResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('ロックを取得したうえで「受験結果」シートへA〜M列の順で1行追記する', () => {
    const record = buildRecord();

    appendExamResult(record);

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
    ]);
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
});
