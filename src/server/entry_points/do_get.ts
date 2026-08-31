import { isExamineeRole } from '../../shared/types/examinee_role';

export const doGet = (e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput => {
  const role = e.parameter.role;

  if (!isExamineeRole(role)) {
    return HtmlService.createHtmlOutput(
      '<p>このページには、管理者から案内された専用URLからアクセスしてください。</p>',
    );
  }

  const template = HtmlService.createTemplateFromFile('client/views/index');
  template.role = role;

  return template
    .evaluate()
    .setTitle('プログラミングスキル判定テスト')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
};
