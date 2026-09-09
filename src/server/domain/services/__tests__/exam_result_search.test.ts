import { describe, expect, test } from 'vitest';
import type { ParsedExamResultRow } from '../../models/exam_result_row';
import { filterExamResultRows } from '../exam_result_search';

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

describe('filterExamResultRows', () => {
  test('条件を指定しない場合は全件を返す', () => {
    const rows = [buildRow(), buildRow({ rowNumber: 3, name: '鈴木 一郎' })];

    expect(filterExamResultRows(rows, {})).toEqual(rows);
  });

  test('受験日時の範囲（開始日のみ）で絞り込む', () => {
    const rows = [
      buildRow({ rowNumber: 2, recordedAt: new Date('2026-04-09T23:59:00') }),
      buildRow({ rowNumber: 3, recordedAt: new Date('2026-04-10T00:00:00') }),
    ];

    const result = filterExamResultRows(rows, { recordedAtFrom: '2026-04-10' });

    expect(result.map((row) => row.rowNumber)).toEqual([3]);
  });

  test('受験日時の範囲（終了日のみ）は当日の終わりまでを含む', () => {
    const rows = [
      buildRow({ rowNumber: 2, recordedAt: new Date('2026-04-10T23:59:59') }),
      buildRow({ rowNumber: 3, recordedAt: new Date('2026-04-11T00:00:01') }),
    ];

    const result = filterExamResultRows(rows, { recordedAtTo: '2026-04-10' });

    expect(result.map((row) => row.rowNumber)).toEqual([2]);
  });

  test('受験日時の範囲（開始日・終了日の両方）で絞り込む', () => {
    const rows = [
      buildRow({ rowNumber: 2, recordedAt: new Date('2026-04-09T12:00:00') }),
      buildRow({ rowNumber: 3, recordedAt: new Date('2026-04-10T12:00:00') }),
      buildRow({ rowNumber: 4, recordedAt: new Date('2026-04-12T12:00:00') }),
    ];

    const result = filterExamResultRows(rows, { recordedAtFrom: '2026-04-10', recordedAtTo: '2026-04-11' });

    expect(result.map((row) => row.rowNumber)).toEqual([3]);
  });

  test('受験者区分は完全一致で絞り込む', () => {
    const rows = [buildRow({ roleLabel: '未経験の新入社員' }), buildRow({ rowNumber: 3, roleLabel: '入社希望者' })];

    const result = filterExamResultRows(rows, { roleLabel: '入社希望者' });

    expect(result).toHaveLength(1);
    expect(result[0]?.roleLabel).toBe('入社希望者');
  });

  test('氏名・社員番号・所属は部分一致で絞り込む', () => {
    const rows = [
      buildRow({ rowNumber: 2, name: '佐藤 美咲', employeeNumber: 'A123456', department: '開発部' }),
      buildRow({ rowNumber: 3, name: '鈴木 一郎', employeeNumber: 'B999999', department: '営業部' }),
    ];

    expect(filterExamResultRows(rows, { name: '佐藤' }).map((r) => r.rowNumber)).toEqual([2]);
    expect(filterExamResultRows(rows, { employeeNumber: '999' }).map((r) => r.rowNumber)).toEqual([3]);
    expect(filterExamResultRows(rows, { department: '発部' }).map((r) => r.rowNumber)).toEqual([2]);
  });

  test('複数条件はAND条件で絞り込む', () => {
    const rows = [
      buildRow({ rowNumber: 2, roleLabel: '未経験の新入社員', name: '佐藤 美咲' }),
      buildRow({ rowNumber: 3, roleLabel: '未経験の新入社員', name: '鈴木 一郎' }),
      buildRow({ rowNumber: 4, roleLabel: '入社希望者', name: '佐藤 花子' }),
    ];

    const result = filterExamResultRows(rows, { roleLabel: '未経験の新入社員', name: '佐藤' });

    expect(result.map((row) => row.rowNumber)).toEqual([2]);
  });

  test('空文字の条件は指定なしとして扱う', () => {
    const rows = [buildRow()];

    const result = filterExamResultRows(rows, { name: '', employeeNumber: '', department: '', roleLabel: '' });

    expect(result).toEqual(rows);
  });

  test('該当なしの場合は空配列を返す', () => {
    const rows = [buildRow({ name: '佐藤 美咲' })];

    expect(filterExamResultRows(rows, { name: '存在しない名前' })).toEqual([]);
  });
});
