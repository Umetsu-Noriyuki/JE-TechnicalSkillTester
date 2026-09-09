import { describe, expect, test } from 'vitest';
import { isNameAllowed } from '../examinee_permission_checker';

describe('isNameAllowed', () => {
  test('完全に一致する氏名が一覧にあればtrue', () => {
    expect(isNameAllowed('山田太郎', ['佐藤花子', '山田太郎'])).toBe(true);
  });

  test('一致する氏名が一覧になければfalse', () => {
    expect(isNameAllowed('鈴木一郎', ['佐藤花子', '山田太郎'])).toBe(false);
  });

  test('半角スペースの有無だけが異なる場合は一致とみなす', () => {
    expect(isNameAllowed('山田 太郎', ['山田太郎'])).toBe(true);
    expect(isNameAllowed('山田太郎', ['山田 太郎'])).toBe(true);
  });

  test('全角スペースの有無だけが異なる場合は一致とみなす', () => {
    expect(isNameAllowed('山田　太郎', ['山田太郎'])).toBe(true);
  });

  test('半角・全角スペースが混在していても一致とみなす', () => {
    expect(isNameAllowed(' 山田　太郎 ', ['山田太郎'])).toBe(true);
  });

  test('許可一覧が空の場合は必ずfalse', () => {
    expect(isNameAllowed('山田太郎', [])).toBe(false);
  });

  test('スペース以外の文字の違いは一致とみなさない', () => {
    expect(isNameAllowed('山田太郎', ['山田次郎'])).toBe(false);
  });
});
