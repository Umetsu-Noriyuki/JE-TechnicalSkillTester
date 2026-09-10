import { describe, expect, test } from 'vitest';
import {
  CATEGORY_NAMES,
  DESCRIPTIVE_SCORE_SLOT_COUNT,
  DESCRIPTIVE_SCORING_PENDING_MARKER,
  EXAM_RESULT_START_ROW,
  GEMINI_API_BASE_URL,
  GEMINI_MAX_RETRY_COUNT,
  GEMINI_MODEL,
  GEMINI_RETRY_DELAY_MILLISECONDS,
  LOCK_WAIT_MILLISECONDS,
  SHEET_NAMES,
  VIEWER_ACCESS_KEY_CELL,
  VIEWER_ALLOWED_EMAIL_DOMAIN,
  VIEWER_LOG_START_ROW,
} from '../constants';

describe('server/config/constants', () => {
  test('問題マスタ・受験結果・受験許可・閲覧ログそれぞれのシート名が定義されている', () => {
    expect(SHEET_NAMES).toEqual({
      questionMaster: '問題マスタ',
      examResult: '受験結果',
      examPermission: '受験許可',
      viewerLog: '閲覧ログ',
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

  test('閲覧画面（15章）に関する定数が定義されている', () => {
    expect(VIEWER_ALLOWED_EMAIL_DOMAIN).toBe('@jinearth.co.jp');
    expect(VIEWER_ACCESS_KEY_CELL).toEqual({ row: 1, column: 2 });
    expect(VIEWER_LOG_START_ROW).toBe(4);
    expect(EXAM_RESULT_START_ROW).toBe(2);
  });
});
