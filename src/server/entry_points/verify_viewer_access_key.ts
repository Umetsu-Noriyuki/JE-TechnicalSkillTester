import { isAccessKeyValid, markViewerAccessGranted } from '../repositories/viewer_log_repository';

/**
 * Access Key入力画面の送信時に google.script.run から呼び出される（15章）。
 * 入力されたAccess Keyが「閲覧ログ」シートB1の設定値と一致する場合のみtrueを返し、
 * その旨（E列="OK"）を対応するログ行（doGetでのアクセス時に記録した行、logRowNumber）へ記録する。
 * 一致しない場合はfalseを返すのみで、ログへの追記は行わない。
 */
export const verifyViewerAccessKey = (logRowNumber: number, accessKey: string): boolean => {
  if (!isAccessKeyValid(accessKey)) {
    return false;
  }
  markViewerAccessGranted(logRowNumber);
  return true;
};
