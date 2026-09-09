import { describe, expect, test } from 'vitest';
import {
  CATEGORY_NAMES,
  DESCRIPTIVE_SCORE_SLOT_COUNT,
  DESCRIPTIVE_SCORING_PENDING_MARKER,
  GEMINI_API_BASE_URL,
  GEMINI_MAX_RETRY_COUNT,
  GEMINI_MODEL,
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

  test('Geminiの再試行対応の定数が定義されている', () => {
    expect(GEMINI_MAX_RETRY_COUNT).toBe(3);
    expect(GEMINI_RETRY_DELAY_MILLISECONDS).toBe(30000);
  });

  test('記述式採点列（N〜T列）に関する定数が定義されている', () => {
    expect(DESCRIPTIVE_SCORE_SLOT_COUNT).toBe(7);
    expect(DESCRIPTIVE_SCORING_PENDING_MARKER).toBe('採点中');
  });
});
