import { LOCK_WAIT_MILLISECONDS } from '../config/constants';

/**
 * スクリプトロックを取得したうえで fn を実行し、完了後（例外発生時も含む）に必ず解放する。
 * 複数の受験者がほぼ同時に書き込む際の競合を防ぐ（11-3章）。
 */
export const withLock = <T>(fn: () => T): T => {
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MILLISECONDS);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
};
