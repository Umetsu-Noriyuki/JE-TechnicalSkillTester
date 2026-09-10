import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getActiveUserEmail } from '../session_client';

describe('getActiveUserEmail', () => {
  const getEmail = vi.fn();

  beforeEach(() => {
    getEmail.mockReset();
    (globalThis as { Session?: unknown }).Session = {
      getActiveUser: vi.fn().mockReturnValue({ getEmail }),
    };
  });

  afterEach(() => {
    delete (globalThis as { Session?: unknown }).Session;
  });

  test('Session.getActiveUser().getEmail()の値をそのまま返す', () => {
    getEmail.mockReturnValue('taro@jinearth.co.jp');

    expect(getActiveUserEmail()).toBe('taro@jinearth.co.jp');
  });

  test('ログイン状態が判別できない場合は空文字を返す', () => {
    getEmail.mockReturnValue('');

    expect(getActiveUserEmail()).toBe('');
  });
});
