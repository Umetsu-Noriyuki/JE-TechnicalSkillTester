import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { include } from '../include';

describe('include', () => {
  const getContent = vi.fn();
  const evaluate = vi.fn();
  const createTemplateFromFile = vi.fn();
  let template: Record<string, unknown>;

  beforeEach(() => {
    getContent.mockReset().mockReturnValue('<p>partial content</p>');
    evaluate.mockReset().mockImplementation(() => ({ getContent }));
    template = { evaluate };
    createTemplateFromFile.mockReset().mockReturnValue(template);

    (globalThis as { HtmlService?: unknown }).HtmlService = {
      createTemplateFromFile,
    };
  });

  afterEach(() => {
    delete (globalThis as { HtmlService?: unknown }).HtmlService;
  });

  test('指定したファイルをテンプレートとして評価し、内容を文字列として返す', () => {
    const result = include('client/views/partials/style');

    expect(createTemplateFromFile).toHaveBeenCalledWith('client/views/partials/style');
    expect(evaluate).toHaveBeenCalled();
    expect(result).toBe('<p>partial content</p>');
  });

  test('dataで渡した変数をテンプレートインスタンスへ設定してから評価する（部分テンプレート側のスクリプトレットが参照できるようにする）', () => {
    include('client/views/partials/start_screen', { role: 'applicant' });

    expect(template.role).toBe('applicant');
  });

  test('dataを省略した場合は追加の変数を設定しない', () => {
    include('client/views/partials/quiz_screen');

    expect(Object.keys(template)).toEqual(['evaluate']);
  });
});
