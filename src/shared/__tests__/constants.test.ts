import { describe, expect, test } from 'vitest';
import {
  CATEGORY_QUOTA,
  EXAM_DURATION_SECONDS,
  PERMISSION_DENIED_ERROR_MESSAGE,
  REMAINING_TIME_WARNING_SECONDS,
  ROLE_LABELS,
  TOTAL_QUESTION_COUNT,
} from '../constants';

describe('shared/constants', () => {
  test('制限時間は30分（1800秒）である', () => {
    expect(EXAM_DURATION_SECONDS).toBe(1800);
  });

  test('出題総数は30問である', () => {
    expect(TOTAL_QUESTION_COUNT).toBe(30);
  });

  test('区分ごとの抽出数は6問である', () => {
    expect(CATEGORY_QUOTA).toBe(6);
  });

  test('残り時間の警告閾値は5分（300秒）である', () => {
    expect(REMAINING_TIME_WARNING_SECONDS).toBe(300);
  });

  test('受験許可エラーの識別メッセージが定義されている', () => {
    expect(PERMISSION_DENIED_ERROR_MESSAGE).toBe('PERMISSION_DENIED');
  });

  test('全ての受験者区分にラベルが定義されている', () => {
    expect(ROLE_LABELS).toEqual({
      applicant: '入社希望者',
      newhire: '未経験の新入社員',
      junior: '入社3年目までの社員',
    });
  });
});
