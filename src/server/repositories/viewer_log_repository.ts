import { SHEET_NAMES, VIEWER_ACCESS_KEY_CELL } from '../config/constants';
import type { ViewerLoginStatus } from '../domain/services/viewer_login_checker';
import { withLock } from '../infrastructure/lock_service_client';
import { appendSheetRow, getRowValues, setRowValues } from '../infrastructure/spreadsheet_client';

const VIEWER_LOG_COLUMNS = { didNotLogin: 2, wrongDomainEmail: 3, user: 4, result: 5 } as const;
const NOT_LOGGED_IN_LABEL = "Don't login";
const ACCESS_KEY_VERIFIED_LABEL = 'OK';

/** 「閲覧ログ」シートB1に設定されたAccess Keyを取得する（15章）。 */
export const getConfiguredAccessKey = (): string => {
  const value = getRowValues(SHEET_NAMES.viewerLog, VIEWER_ACCESS_KEY_CELL.row, VIEWER_ACCESS_KEY_CELL.column, 1)[0];
  return typeof value === 'string' ? value : '';
};

/**
 * 入力されたAccess Keyが、「閲覧ログ」シートB1の設定値と一致するかを検証する（15章）。
 * B1が未設定（空文字）の場合は、誤って全アクセスを許可してしまわないよう常にfalseとする。
 * 閲覧画面が表示された後の検索・詳細取得も含め、呼び出しのたびにこの関数で再検証すること
 * （クライアント側の画面遷移状態を信用しない、6-3章の受験許可チェックと同じ考え方）。
 */
export const isAccessKeyValid = (accessKey: string): boolean => {
  const configuredKey = getConfiguredAccessKey();
  return configuredKey !== '' && accessKey === configuredKey;
};

const toLogRow = (status: ViewerLoginStatus): (string | Date)[] => {
  const row: (string | Date)[] = [new Date(), '', '', ''];
  if (status.kind === 'not_logged_in') {
    row[VIEWER_LOG_COLUMNS.didNotLogin - 1] = NOT_LOGGED_IN_LABEL;
  } else if (status.kind === 'wrong_domain') {
    row[VIEWER_LOG_COLUMNS.wrongDomainEmail - 1] = status.email;
    row[VIEWER_LOG_COLUMNS.user - 1] = status.email;
  } else {
    row[VIEWER_LOG_COLUMNS.user - 1] = status.email;
  }
  return row;
};

/**
 * 「閲覧ログ」シートへ、閲覧画面（role=viewer）へのアクセス状況を1行追記する（15章）。
 * ログイン状態（未ログイン／組織外／許可ドメイン）に応じてB〜D列を記録し、A列にアクセス日時を記録する。
 * 戻り値は追記した行番号（E列を後から更新する際のキーとなる）。
 */
export const appendViewerLogEntry = (status: ViewerLoginStatus): number =>
  withLock(() => appendSheetRow(SHEET_NAMES.viewerLog, toLogRow(status)));

/** 正しいAccess Keyが入力され閲覧画面を表示できたことを、該当ログ行のE列へ記録する（15章）。 */
export const markViewerAccessGranted = (rowNumber: number): void => {
  withLock(() => {
    setRowValues(SHEET_NAMES.viewerLog, rowNumber, VIEWER_LOG_COLUMNS.result, [ACCESS_KEY_VERIFIED_LABEL]);
  });
};
