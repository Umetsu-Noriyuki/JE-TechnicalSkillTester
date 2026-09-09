import { describe, expect, test, vi } from 'vitest';
import { getSheetValues } from '../../infrastructure/spreadsheet_client';
import { findAllowedExamineeNames } from '../permission_repository';

vi.mock('../../infrastructure/spreadsheet_client', () => ({
  getSheetValues: vi.fn(),
}));

describe('findAllowedExamineeNames', () => {
  test('「受験許可」シートのヘッダー行を除くA列の氏名一覧を返す', () => {
    vi.mocked(getSheetValues).mockReturnValue([['氏名'], ['山田太郎'], ['佐藤花子']]);

    const result = findAllowedExamineeNames();

    expect(getSheetValues).toHaveBeenCalledWith('受験許可');
    expect(result).toEqual(['山田太郎', '佐藤花子']);
  });

  test('空欄の行は無視する', () => {
    vi.mocked(getSheetValues).mockReturnValue([['氏名'], ['山田太郎'], [''], ['   ']]);

    const result = findAllowedExamineeNames();

    expect(result).toEqual(['山田太郎']);
  });

  test('ヘッダー行のみ（データなし）の場合は空配列を返す', () => {
    vi.mocked(getSheetValues).mockReturnValue([['氏名']]);

    const result = findAllowedExamineeNames();

    expect(result).toEqual([]);
  });
});
