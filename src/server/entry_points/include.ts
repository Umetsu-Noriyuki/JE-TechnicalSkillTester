export const include = (filename: string): string =>
  HtmlService.createHtmlOutputFromFile(filename).getContent();
