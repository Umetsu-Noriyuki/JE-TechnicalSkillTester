import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { doGet } from '../do_get';

const createDoGetEvent = (role?: string): GoogleAppsScript.Events.DoGet =>
  ({ parameter: role !== undefined ? { role } : {} }) as unknown as GoogleAppsScript.Events.DoGet;

describe('doGet', () => {
  const createHtmlOutput = vi.fn();
  const createTemplateFromFile = vi.fn();

  beforeEach(() => {
    createHtmlOutput.mockReset();
    createTemplateFromFile.mockReset();

    (globalThis as { HtmlService?: unknown }).HtmlService = {
      createHtmlOutput,
      createTemplateFromFile,
    };
  });

  afterEach(() => {
    delete (globalThis as { HtmlService?: unknown }).HtmlService;
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
    expect(evaluatedOutput.addMetaTag).toHaveBeenCalledWith(
      'viewport',
      'width=device-width, initial-scale=1',
    );
    expect(result).toBe(evaluatedOutput);
  });
});
