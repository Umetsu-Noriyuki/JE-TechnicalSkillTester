import { describe, expect, test } from 'vitest';
import {
  CATEGORY_NAMES,
  GEMINI_API_BASE_URL,
  GEMINI_MAX_REQUESTS_PER_MINUTE,
  GEMINI_MODEL,
  GEMINI_RATE_LIMIT_COOLDOWN_MILLISECONDS,
  GEMINI_RETRY_DELAY_MILLISECONDS,
  LOCK_WAIT_MILLISECONDS,
  SHEET_NAMES,
} from '../constants';

describe('server/config/constants', () => {
  test('問題マスタ・受験結果・受験許可それぞれのシート名が定義されている', () => {
    expect(SHEET_NAMES).toEqual({
      questionMaster: '問題マスタ',
      examResult: '受験結果',
      examPermission: '受験許可',
    });
  });

  test('ロック待機時間は30秒（30000ミリ秒）である', () => {
    expect(LOCK_WAIT_MILLISECONDS).toBe(30000);
  });

  test('区分別正解率列の並び順は5区分である', () => {
    expect(CATEGORY_NAMES).toEqual(['コーディング', 'SQL', 'プログラミング技法', 'ロジカルシンキング', '行動指針']);
  });

  test('Geminiのモデル名・APIベースURLが定義されている', () => {
    expect(GEMINI_MODEL).toBe('gemini-3.6-flash');
    expect(GEMINI_API_BASE_URL).toBe('https://generativelanguage.googleapis.com/v1beta/models');
  });

  test('Geminiのレート制限対応の定数が定義されている', () => {
    expect(GEMINI_MAX_REQUESTS_PER_MINUTE).toBe(4);
    expect(GEMINI_RATE_LIMIT_COOLDOWN_MILLISECONDS).toBe(61000);
    expect(GEMINI_RETRY_DELAY_MILLISECONDS).toBe(30000);
  });
});
