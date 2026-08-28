const VALID_ROLES = ['applicant', 'newhire', 'junior'] as const;

const isValidRole = (role: string | undefined): boolean =>
  role !== undefined && (VALID_ROLES as readonly string[]).includes(role);

export const doGet = (e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput => {
  const role = e.parameter.role;

  if (!isValidRole(role)) {
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
