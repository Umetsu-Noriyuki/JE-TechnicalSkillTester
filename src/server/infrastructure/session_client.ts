/**
 * アクセス者のGoogleアカウントのメールアドレスを取得する薄いラッパー（15章）。
 * ログイン状態が判別できない場合（未ログイン、または組織外ユーザー等）は空文字を返す
 * （Session.getActiveUser().getEmail() のGAS標準の挙動をそのまま利用する）。
 */
export const getActiveUserEmail = (): string => Session.getActiveUser().getEmail();
