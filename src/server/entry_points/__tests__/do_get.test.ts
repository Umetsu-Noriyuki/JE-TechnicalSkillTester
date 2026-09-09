import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as viewerLogRepository from '../../repositories/viewer_log_repository';
import { doGet } from '../do_get';

vi.mock('../../repositories/viewer_log_repository');

const createDoGetEvent = (role?: string): GoogleAppsScript.Events.DoGet =>
  ({ parameter: role !== undefined ? { role } : {} }) as unknown as GoogleAppsScript.Events.DoGet;

describe('doGet', () => {
  const createHtmlOutput = vi.fn();
  const createTemplateFromFile = vi.fn();
  const getEmail = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createHtmlOutput.mockReset();
    createTemplateFromFile.mockReset();
    getEmail.mockReset().mockReturnValue('');
    vi.mocked(viewerLogRepository.appendViewerLogEntry).mockReturnValue(4);

    (globalThis as { HtmlService?: unknown }).HtmlService = {
      createHtmlOutput,
      createTemplateFromFile,
    };
    (globalThis as { Session?: unknown }).Session = {
      getActiveUser: vi.fn().mockReturnValue({ getEmail }),
    };
  });

  afterEach(() => {
    delete (globalThis as { HtmlService?: unknown }).HtmlService;
    delete (globalThis as { Session?: unknown }).Session;
  });

  test('roleパラメータが未指定の場合、案内メッセージのHTMLを返す', () => {
    const guidanceOutput = {};
    createHtmlOutput.mockReturnValue(guidanceOutput);

    const result = doGet(createDoGetEvent());

    expect(createHtmlOutput).toHaveBeenCalledWith(expect.stringContaining('専用URL'));
    expect(createTemplateFromFile).not.toHaveBeenCalled();
    expect(result).toBe(guidanceOutput);
  });

  test('roleパラメータが不正な値の場合、案内メッセージのHTMLを返す', () => {
    createHtmlOutput.mockReturnValue({});

    doGet(createDoGetEvent('unknown'));

    expect(createHtmlOutput).toHaveBeenCalled();
    expect(createTemplateFromFile).not.toHaveBeenCalled();
  });

  test('roleパラメータが正常な値の場合、テンプレートを評価して返す', () => {
    const evaluatedOutput = {
      setTitle: vi.fn().mockReturnThis(),
      addMetaTag: vi.fn().mockReturnThis(),
    };
    const template: { role?: string; evaluate: () => unknown } = {
      evaluate: vi.fn().mockReturnValue(evaluatedOutput),
    };
    createTemplateFromFile.mockReturnValue(template);

    const result = doGet(createDoGetEvent('applicant'));

    expect(createTemplateFromFile).toHaveBeenCalledWith('client/views/index');
    expect(template.role).toBe('applicant');
    expect(evaluatedOutput.setTitle).toHaveBeenCalledWith('プログラミングスキル判定テスト');
    expect(evaluatedOutput.addMetaTag).toHaveBeenCalledWith('viewport', 'width=device-width, initial-scale=1');
    expect(result).toBe(evaluatedOutput);
  });

  describe('role=viewer（15章）', () => {
    test('未ログインの場合、アクセス拒否メッセージを表示し、閲覧ログへ記録する', () => {
      getEmail.mockReturnValue('');
      createHtmlOutput.mockReturnValue({});

      doGet(createDoGetEvent('viewer'));

      expect(viewerLogRepository.appendViewerLogEntry).toHaveBeenCalledWith({ kind: 'not_logged_in' });
      expect(createHtmlOutput).toHaveBeenCalledWith(expect.stringContaining('Did you lost your way ?'));
      expect(createTemplateFromFile).not.toHaveBeenCalled();
    });

    test('許可ドメイン以外でログイン済みの場合、アクセス拒否メッセージを表示し、閲覧ログへ記録する', () => {
      getEmail.mockReturnValue('taro@example.com');
      createHtmlOutput.mockReturnValue({});

      doGet(createDoGetEvent('viewer'));

      expect(viewerLogRepository.appendViewerLogEntry).toHaveBeenCalledWith({
        kind: 'wrong_domain',
        email: 'taro@example.com',
      });
      expect(createHtmlOutput).toHaveBeenCalledWith(expect.stringContaining('Did you lost your way ?'));
      expect(createTemplateFromFile).not.toHaveBeenCalled();
    });

    test('許可ドメインでログイン済みの場合、Access Key入力画面（roleとログ行番号付き）のテンプレートを返す', () => {
      getEmail.mockReturnValue('taro@jinearth.co.jp');
      const evaluatedOutput = {
        setTitle: vi.fn().mockReturnThis(),
        addMetaTag: vi.fn().mockReturnThis(),
      };
      const template: { role?: string; viewerLogRowNumber?: number; evaluate: () => unknown } = {
        evaluate: vi.fn().mockReturnValue(evaluatedOutput),
      };
      createTemplateFromFile.mockReturnValue(template);

      const result = doGet(createDoGetEvent('viewer'));

      expect(viewerLogRepository.appendViewerLogEntry).toHaveBeenCalledWith({
        kind: 'ok',
        email: 'taro@jinearth.co.jp',
      });
      expect(createTemplateFromFile).toHaveBeenCalledWith('client/views/index');
      expect(template.role).toBe('viewer');
      expect(template.viewerLogRowNumber).toBe(4);
      expect(result).toBe(evaluatedOutput);
    });
  });
});
