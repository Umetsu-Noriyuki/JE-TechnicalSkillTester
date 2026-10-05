import { VIEWER_ACCESS_KEY_INVALID_ERROR_MESSAGE } from '../../shared/constants';
import type { ExamResultPdfDownload } from '../../shared/types/exam_result_pdf';
import { buildExamResultDetail } from '../domain/services/exam_result_detail_builder';
import { findExamResultRowByRowNumber } from '../repositories/exam_result_query_repository';
import { isAccessKeyValid } from '../repositories/viewer_log_repository';
import { include } from './include';

const PDF_TEMPLATE_PATH = 'client/views/partials/exam_result_pdf';

/** ファイル名に使えない文字（Windows/macOS双方で問題になりうるもの）を置換する。 */
const sanitizeFileNamePart = (value: string): string => value.replace(/[\\/:*?"<>|]/g, '_');

const pad2 = (value: number): string => String(value).padStart(2, '0');

const formatDateForFileName = (date: Date): string =>
  `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;

const formatRecordedAtText = (date: Date): string =>
  `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

/**
 * 閲覧画面の「受験結果をPDFでダウンロード」ボタン押下時に google.script.run から呼び出される（15章）。
 * Access Keyは他の閲覧画面用エントリーポイントと同様、呼び出しのたびにサーバー側で再検証する。
 * 受験結果詳細（採点結果画面・閲覧画面と同じデータ）を、PDF変換専用の簡易HTMLテンプレート
 * （exam_result_pdf.html）へ描画し、Utilities.newBlob().getAs('application/pdf') でPDF化する。
 */
export const downloadExamResultPdf = (accessKey: string, rowNumber: number): ExamResultPdfDownload => {
  if (!isAccessKeyValid(accessKey)) {
    throw new Error(VIEWER_ACCESS_KEY_INVALID_ERROR_MESSAGE);
  }

  const row = findExamResultRowByRowNumber(rowNumber);
  if (row === null) {
    throw new Error(`受験結果が見つかりません（行番号: ${rowNumber}）`);
  }

  const detail = buildExamResultDetail(row);
  const html = include(PDF_TEMPLATE_PATH, { detail, recordedAtText: formatRecordedAtText(row.recordedAt) });
  const pdfBlob = Utilities.newBlob(html, 'text/html', 'result.html').getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  const fileName = `受験結果_${sanitizeFileNamePart(detail.name)}_${formatDateForFileName(row.recordedAt)}.pdf`;

  return { base64, fileName };
};
