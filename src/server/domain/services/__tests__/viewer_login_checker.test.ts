import { describe, expect, test } from 'vitest';
import { checkViewerLoginStatus } from '../viewer_login_checker';

describe('checkViewerLoginStatus', () => {
  test('空文字の場合はnot_logged_inを返す', () => {
    expect(checkViewerLoginStatus('')).toEqual({ kind: 'not_logged_in' });
  });

  test('空白のみの場合もnot_logged_inを返す', () => {
    expect(checkViewerLoginStatus('   ')).toEqual({ kind: 'not_logged_in' });
  });

  test('@jinearth.co.jp以外のドメインの場合はwrong_domainとメールアドレスを返す', () => {
    expect(checkViewerLoginStatus('taro@example.com')).toEqual({
      kind: 'wrong_domain',
      email: 'taro@example.com',
    });
  });

  test('@jinearth.co.jpの場合はokとメールアドレスを返す', () => {
    expect(checkViewerLoginStatus('taro@jinearth.co.jp')).toEqual({
      kind: 'ok',
      email: 'taro@jinearth.co.jp',
    });
  });

  test('サブドメインなど末尾が一致しない場合はwrong_domainを返す', () => {
    expect(checkViewerLoginStatus('taro@notjinearth.co.jp')).toEqual({
      kind: 'wrong_domain',
      email: 'taro@notjinearth.co.jp',
    });
  });
});
