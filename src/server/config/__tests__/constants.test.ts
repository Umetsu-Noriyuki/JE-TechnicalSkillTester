import { describe, expect, test } from 'vitest';
import { LOCK_WAIT_MILLISECONDS, SHEET_NAMES } from '../constants';

describe('server/config/constants', () => {
  test('問題マスタ・受験結果それぞれのシート名が定義されている', () => {
    expect(SHEET_NAMES).toEqual({
      questionMaster: '問題マスタ',
      examResult: '受験結果',
    });
  });

  test('ロック待機時間は30秒（30000ミリ秒）である', () => {
    expect(LOCK_WAIT_MILLISECONDS).toBe(30000);
  });
});
