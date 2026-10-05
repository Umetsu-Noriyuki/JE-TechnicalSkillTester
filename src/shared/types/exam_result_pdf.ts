/** 閲覧画面（15章）の受験結果PDFダウンロードの戻り値。 */
export interface ExamResultPdfDownload {
  /** PDFファイルのバイナリ内容（Base64エンコード済み）。 */
  base64: string;
  /** ダウンロード時のファイル名。 */
  fileName: string;
}
