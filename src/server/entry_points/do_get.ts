import { isExamineeRole } from '../../shared/types/examinee_role';
import { checkViewerLoginStatus } from '../domain/services/viewer_login_checker';
import { getActiveUserEmail } from '../infrastructure/session_client';
import { appendViewerLogEntry } from '../repositories/viewer_log_repository';

/**
 * role=viewer だが、閲覧画面（15章）へのアクセスを許可されなかった場合に表示するメッセージ。
 * 意図的に英語かつ意味を持たせない文面とし、正規の案内メッセージと区別できるようにしている。
 */
const VIEWER_ACCESS_DENIED_MESSAGE = 'Did you lost your way ?';

const renderMessageOnly = (message: string): GoogleAppsScript.HTML.HtmlOutput =>
  HtmlService.createHtmlOutput(`<p>${message}</p>`);

const evaluateIndexTemplate = (
  templateData: Readonly<Record<string, unknown>>,
): GoogleAppsScript.HTML.HtmlOutput => {
  const template = HtmlService.createTemplateFromFile('client/views/index');
  Object.assign(template, templateData);

  return template
    .evaluate()
    .setTitle('プログラミングスキル判定テスト')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
};

/**
 * role=viewer でのアクセスを処理する（15章）。アクセス者のGoogleログイン状態は毎回
 * 「閲覧ログ」シートへ記録し（成功・失敗を問わず）、許可ドメインでログイン済みの場合のみ
 * Access Key入力画面を表示する。それ以外は VIEWER_ACCESS_DENIED_MESSAGE のみを返す。
 */
const handleViewerRequest = (): GoogleAppsScript.HTML.HtmlOutput => {
  const loginStatus = checkViewerLoginStatus(getActiveUserEmail());
  const viewerLogRowNumber = appendViewerLogEntry(loginStatus);

  if (loginStatus.kind !== 'ok') {
    return renderMessageOnly(VIEWER_ACCESS_DENIED_MESSAGE);
  }

  return evaluateIndexTemplate({ role: 'viewer', viewerLogRowNumber });
};

export const doGet = (e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput => {
  const role = e.parameter.role;

  if (role === 'viewer') {
    return handleViewerRequest();
  }

  if (!isExamineeRole(role)) {
    return renderMessageOnly('このページには、管理者から案内された専用URLからアクセスしてください。');
  }

  return evaluateIndexTemplate({ role });
};
