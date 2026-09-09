import { VIEWER_ALLOWED_EMAIL_DOMAIN } from '../../config/constants';

export type ViewerLoginStatus =
  | { kind: 'not_logged_in' }
  | { kind: 'wrong_domain'; email: string }
  | { kind: 'ok'; email: string };

/**
 * 閲覧画面（15章）へのアクセス時、Googleアカウントのログイン状態を判定する純粋関数。
 * - 空文字（未ログイン、または組織外ユーザー等でGASが識別できない場合）→ not_logged_in
 * - ログイン済みだが VIEWER_ALLOWED_EMAIL_DOMAIN 以外のドメイン → wrong_domain
 * - ログイン済みで VIEWER_ALLOWED_EMAIL_DOMAIN のドメイン → ok
 */
export const checkViewerLoginStatus = (email: string): ViewerLoginStatus => {
  if (email.trim() === '') {
    return { kind: 'not_logged_in' };
  }
  if (!email.endsWith(VIEWER_ALLOWED_EMAIL_DOMAIN)) {
    return { kind: 'wrong_domain', email };
  }
  return { kind: 'ok', email };
};
