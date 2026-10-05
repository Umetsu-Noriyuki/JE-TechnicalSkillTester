import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ParsedExamResultRow } from '../../domain/models/exam_result_row';
import * as examResultQueryRepository from '../../repositories/exam_result_query_repository';
import * as viewerLogRepository from '../../repositories/viewer_log_repository';
import { downloadExamResultPdf } from '../download_exam_result_pdf';
import * as includeModule from '../include';

vi.mock('../../repositories/exam_result_query_repository');
vi.mock('../../repositories/viewer_log_repository');
vi.mock('../include');

const buildRow = (overrides: Partial<ParsedExamResultRow> = {}): ParsedExamResultRow => ({
  rowNumber: 5,
  recordedAt: new Date('2026-04-10T14:32:00'),
  roleLabel: '未経験の新入社員',
  name: '佐藤 美咲',
  employeeNumber: 'A123456',
  department: '開発部',
  overallCorrectRate: 85,
  durationText: '27分41秒（時間内に終了）',
  answerDetails: [
    { questionId: 'q1', category: 'コーディング', subCategory: 'if文', format: 'choice', questionText: '問題1', answerContent: 'A', score: 100, isCorrect: true },
  ],
  ...overrides,
});

describe('downloadExamResultPdf', () => {
  const getAs = vi.fn();
  const getBytes = vi.fn();
  const newBlob = vi.fn();
  const base64Encode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(viewerLogRepository.isAccessKeyValid).mockReturnValue(true);
    vi.mocked(examResultQueryRepository.findExamResultRowByRowNumber).mockReturnValue(buildRow());
    vi.mocked(includeModule.include).mockReturnValue('<html>PDF本文</html>');

    getBytes.mockReturnValue([1, 2, 3]);
    getAs.mockReturnValue({ getBytes });
    newBlob.mockReturnValue({ getAs });
    base64Encode.mockReturnValue('base64-encoded-pdf');

    (globalThis as { Utilities?: unknown }).Utilities = { newBlob, base64Encode };
  });

  afterEach(() => {
    delete (globalThis as { Utilities?: unknown }).Utilities;
  });

  test('Access Keyが不正な場合は「受験結果」シートへアクセスせず例外を投げる', () => {
    vi.mocked(viewerLogRepository.isAccessKeyValid).mockReturnValue(false);

    expect(() => downloadExamResultPdf('wrong-key', 5)).toThrow('VIEWER_ACCESS_KEY_INVALID');
    expect(examResultQueryRepository.findExamResultRowByRowNumber).not.toHaveBeenCalled();
    expect(newBlob).not.toHaveBeenCalled();
  });

  test('該当行が存在しない場合は例外を投げる', () => {
    vi.mocked(examResultQueryRepository.findExamResultRowByRowNumber).mockReturnValue(null);

    expect(() => downloadExamResultPdf('secret-key', 999)).toThrow('受験結果が見つかりません');
  });

  test('PDF用テンプレートをHTML化し、application/pdfへ変換してBase64で返す', () => {
    const result = downloadExamResultPdf('secret-key', 5);

    expect(includeModule.include).toHaveBeenCalledWith(
      'client/views/partials/exam_result_pdf',
      expect.objectContaining({ recordedAtText: '2026/04/10 14:32' }),
    );
    expect(newBlob).toHaveBeenCalledWith('<html>PDF本文</html>', 'text/html', 'result.html');
    expect(getAs).toHaveBeenCalledWith('application/pdf');
    expect(base64Encode).toHaveBeenCalledWith([1, 2, 3]);
    expect(result.base64).toBe('base64-encoded-pdf');
  });

  test('ファイル名に氏名・受験日を含める', () => {
    const result = downloadExamResultPdf('secret-key', 5);

    expect(result.fileName).toBe('受験結果_佐藤 美咲_20260410.pdf');
  });

  test('氏名にファイル名として使えない文字が含まれる場合は置換する', () => {
    vi.mocked(examResultQueryRepository.findExamResultRowByRowNumber).mockReturnValue(
      buildRow({ name: '山田/太郎:test' }),
    );

    const result = downloadExamResultPdf('secret-key', 5);

    expect(result.fileName).toBe('受験結果_山田_太郎_test_20260410.pdf');
  });
});
