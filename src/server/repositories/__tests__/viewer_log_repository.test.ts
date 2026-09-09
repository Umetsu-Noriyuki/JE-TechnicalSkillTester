import { beforeEach, describe, expect, test, vi } from 'vitest';
import { withLock } from '../../infrastructure/lock_service_client';
import { appendSheetRow, getRowValues, setRowValues } from '../../infrastructure/spreadsheet_client';
import { appendViewerLogEntry, getConfiguredAccessKey, isAccessKeyValid, markViewerAccessGranted } from '../viewer_log_repository';

vi.mock('../../infrastructure/spreadsheet_client', () => ({
  appendSheetRow: vi.fn(),
  getRowValues: vi.fn(),
  setRowValues: vi.fn(),
}));

vi.mock('../../infrastructure/lock_service_client', () => ({
  withLock: vi.fn((fn: () => unknown) => fn()),
}));

describe('getConfiguredAccessKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('「閲覧ログ」シートB1の値を返す', () => {
    vi.mocked(getRowValues).mockReturnValue(['secret-key']);

    expect(getConfiguredAccessKey()).toBe('secret-key');
    expect(getRowValues).toHaveBeenCalledWith('閲覧ログ', 1, 2, 1);
  });

  test('B1が文字列でない場合は空文字を返す', () => {
    vi.mocked(getRowValues).mockReturnValue([undefined]);

    expect(getConfiguredAccessKey()).toBe('');
  });
});

describe('isAccessKeyValid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('B1の値と一致すればtrue', () => {
    vi.mocked(getRowValues).mockReturnValue(['secret-key']);

    expect(isAccessKeyValid('secret-key')).toBe(true);
  });

  test('B1の値と一致しなければfalse', () => {
    vi.mocked(getRowValues).mockReturnValue(['secret-key']);

    expect(isAccessKeyValid('wrong-key')).toBe(false);
  });

  test('B1が未設定（空文字）の場合は、入力も空文字であってもfalse', () => {
    vi.mocked(getRowValues).mockReturnValue([undefined]);

    expect(isAccessKeyValid('')).toBe(false);
  });
});

describe('appendViewerLogEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(appendSheetRow).mockReturnValue(4);
  });

  test('未ログインの場合はB列に"Don\'t login"を記録し、C・D列は空文字', () => {
    const rowNumber = appendViewerLogEntry({ kind: 'not_logged_in' });

    expect(withLock).toHaveBeenCalled();
    const [, row] = vi.mocked(appendSheetRow).mock.calls[0] ?? [];
    expect(row?.[1]).toBe("Don't login");
    expect(row?.[2]).toBe('');
    expect(row?.[3]).toBe('');
    expect(rowNumber).toBe(4);
  });

  test('ドメイン外の場合はC・D列にアカウントを記録し、B列は空文字', () => {
    appendViewerLogEntry({ kind: 'wrong_domain', email: 'taro@example.com' });

    const [, row] = vi.mocked(appendSheetRow).mock.calls[0] ?? [];
    expect(row?.[1]).toBe('');
    expect(row?.[2]).toBe('taro@example.com');
    expect(row?.[3]).toBe('taro@example.com');
  });

  test('許可ドメインの場合はD列にアカウントを記録し、B・C列は空文字', () => {
    appendViewerLogEntry({ kind: 'ok', email: 'taro@jinearth.co.jp' });

    const [, row] = vi.mocked(appendSheetRow).mock.calls[0] ?? [];
    expect(row?.[1]).toBe('');
    expect(row?.[2]).toBe('');
    expect(row?.[3]).toBe('taro@jinearth.co.jp');
  });

  test('A列にはアクセス日時（Date）を記録する', () => {
    appendViewerLogEntry({ kind: 'ok', email: 'taro@jinearth.co.jp' });

    const [, row] = vi.mocked(appendSheetRow).mock.calls[0] ?? [];
    expect(row?.[0]).toBeInstanceOf(Date);
  });
});

describe('markViewerAccessGranted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('該当行のE列に"OK"を記録する', () => {
    markViewerAccessGranted(4);

    expect(withLock).toHaveBeenCalled();
    expect(setRowValues).toHaveBeenCalledWith('閲覧ログ', 4, 5, ['OK']);
  });
});
