import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as viewerLogRepository from '../../repositories/viewer_log_repository';
import { verifyViewerAccessKey } from '../verify_viewer_access_key';

vi.mock('../../repositories/viewer_log_repository');

describe('verifyViewerAccessKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Access Keyが一致する場合、該当ログ行へOKを記録しtrueを返す', () => {
    vi.mocked(viewerLogRepository.isAccessKeyValid).mockReturnValue(true);

    const result = verifyViewerAccessKey(4, 'secret-key');

    expect(result).toBe(true);
    expect(viewerLogRepository.isAccessKeyValid).toHaveBeenCalledWith('secret-key');
    expect(viewerLogRepository.markViewerAccessGranted).toHaveBeenCalledWith(4);
  });

  test('Access Keyが一致しない場合、ログを更新せずfalseを返す', () => {
    vi.mocked(viewerLogRepository.isAccessKeyValid).mockReturnValue(false);

    const result = verifyViewerAccessKey(4, 'wrong-key');

    expect(result).toBe(false);
    expect(viewerLogRepository.markViewerAccessGranted).not.toHaveBeenCalled();
  });
});
