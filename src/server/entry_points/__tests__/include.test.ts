import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { include } from '../include';

describe('include', () => {
  const getContent = vi.fn();
  const createHtmlOutputFromFile = vi.fn();

  beforeEach(() => {
    getContent.mockReset().mockReturnValue('<p>partial content</p>');
    createHtmlOutputFromFile.mockReset().mockReturnValue({ getContent });

    (globalThis as { HtmlService?: unknown }).HtmlService = {
      createHtmlOutputFromFile,
    };
  });

  afterEach(() => {
    delete (globalThis as { HtmlService?: unknown }).HtmlService;
  });

  test('指定したファイル名のHTML断片の内容を文字列として返す', () => {
    const result = include('client/views/partials/style');

    expect(createHtmlOutputFromFile).toHaveBeenCalledWith('client/views/partials/style');
    expect(result).toBe('<p>partial content</p>');
  });
});
