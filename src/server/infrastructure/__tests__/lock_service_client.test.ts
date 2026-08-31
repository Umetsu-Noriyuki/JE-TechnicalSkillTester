import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { withLock } from '../lock_service_client';

describe('withLock', () => {
  const waitLock = vi.fn();
  const releaseLock = vi.fn();
  const getScriptLock = vi.fn();

  beforeEach(() => {
    waitLock.mockReset();
    releaseLock.mockReset();
    getScriptLock.mockReset().mockReturnValue({ waitLock, releaseLock });

    (globalThis as { LockService?: unknown }).LockService = { getScriptLock };
  });

  afterEach(() => {
    delete (globalThis as { LockService?: unknown }).LockService;
  });

  test('ロックを取得（最大30秒待機）し、処理実行後に解放して結果を返す', () => {
    const result = withLock(() => 'done');

    expect(getScriptLock).toHaveBeenCalled();
    expect(waitLock).toHaveBeenCalledWith(30000);
    expect(releaseLock).toHaveBeenCalled();
    expect(result).toBe('done');
  });

  test('処理中に例外が発生してもロックは解放され、例外はそのまま伝播する', () => {
    expect(() =>
      withLock(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(releaseLock).toHaveBeenCalled();
  });
});
