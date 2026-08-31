/**
 * 指定したHTML部分テンプレートを、そのファイル自身が持つスクリプトレット（<? %>等）も
 * 評価したうえで文字列として返す。
 *
 * createHtmlOutputFromFile() は生のファイル内容を返すだけでスクリプトレットを一切評価しない
 * ため、部分テンプレート側の `<? if (role === ...) { ?>` 等が評価されず、そのまま文字列として
 * 画面に表示されてしまう不具合があった。createTemplateFromFile().evaluate() を使うことで、
 * 部分テンプレート自身のスクリプトレットも正しく評価されるようにする。
 *
 * 各テンプレートインスタンスは独立した変数バインディングを持つため、呼び出し元の変数は
 * 自動的には引き継がれない。部分テンプレート側で参照する変数（role等）は data 引数で
 * 明示的に渡すこと。
 */
export const include = (filename: string, data: Readonly<Record<string, unknown>> = {}): string => {
  const template = HtmlService.createTemplateFromFile(filename);
  Object.assign(template, data);
  return template.evaluate().getContent();
};
