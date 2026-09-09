import type { CategoryScore } from '../../shared/types/scoring_result';
import { CATEGORY_NAMES, DESCRIPTIVE_SCORE_SLOT_COUNT, DESCRIPTIVE_SCORING_PENDING_MARKER, SHEET_NAMES } from '../config/constants';
import type { DescriptiveScoreCell, DescriptiveScoreSlot, ExamResultRecord } from '../domain/models/exam_result_record';
import { appendSheetRow, getRowValues, setRowValues } from '../infrastructure/spreadsheet_client';
import { withLock } from '../infrastructure/lock_service_client';

const formatCategoryCell = (categoryScores: readonly CategoryScore[], categoryName: string): string => {
  const score = categoryScores.find((s) => s.categoryName === categoryName);
  if (score === undefined) {
    return '-';
  }
  return `${score.correctRate}% (${score.totalScore}/${score.questionCount * 100}点)`;
};

const formatDuration = (record: Pick<ExamResultRecord, 'elapsedSeconds' | 'isTimedOut'>): string => {
  const minutes = Math.floor(record.elapsedSeconds / 60);
  const seconds = record.elapsedSeconds % 60;
  const statusLabel = record.isTimedOut ? '時間切れ' : '時間内に終了';
  return `${minutes}分${seconds}秒（${statusLabel}）`;
};

const formatDescriptiveScoreCell = (cell: DescriptiveScoreCell | undefined): string => {
  if (cell === undefined) {
    return '';
  }
  return cell === 'pending' ? DESCRIPTIVE_SCORING_PENDING_MARKER : JSON.stringify(cell);
};

/** 記述式採点列（N〜T列）を、固定 DESCRIPTIVE_SCORE_SLOT_COUNT 列分に揃えて並べる。 */
const toDescriptiveScoreCells = (cells: readonly DescriptiveScoreCell[]): string[] =>
  Array.from({ length: DESCRIPTIVE_SCORE_SLOT_COUNT }, (_, i) => formatDescriptiveScoreCell(cells[i]));

const toRow = (record: ExamResultRecord): (string | number | Date)[] => [
  record.recordedAt,
  record.roleLabel,
  record.name,
  record.employeeNumber,
  record.department,
  record.overallCorrectRate,
  ...CATEGORY_NAMES.map((categoryName) => formatCategoryCell(record.categoryScores, categoryName)),
  formatDuration(record),
  record.answerDetailsJson,
  ...toDescriptiveScoreCells(record.descriptiveScoreCells),
];

/**
 * 「受験結果」シートへ1行追記する（11-2章の列構成A〜T）。
 * 複数受験者の同時書き込みによる競合を防ぐため、スクリプトロックを取得して実行する（11-3章）。
 * 記述式採点（N〜T列）は、この時点ではバックグラウンド採点が完了していないため
 * DESCRIPTIVE_SCORING_PENDING_MARKER を書き込む（10-1章）。
 * 戻り値は追記した行番号（resultId）。バックグラウンド採点・ポーリング処理で対象行を特定するために使う。
 */
export const appendExamResult = (record: ExamResultRecord): number =>
  withLock(() => appendSheetRow(SHEET_NAMES.examResult, toRow(record)));

export interface ExamResultDescriptiveUpdate {
  overallCorrectRate: number;
  categoryScores: readonly CategoryScore[];
  answerDetailsJson: string;
  descriptiveScoreCells: readonly DescriptiveScoreCell[];
}

/**
 * バックグラウンドでの記述式採点（10-1章）完了後、既存行の総合・区分別正解率（F〜K列）、
 * 回答詳細（M列）、記述式採点結果（N〜T列）を最終値で上書きする。
 */
export const updateExamResultAfterDescriptiveScoring = (
  rowNumber: number,
  update: ExamResultDescriptiveUpdate,
): void => {
  withLock(() => {
    setRowValues(SHEET_NAMES.examResult, rowNumber, 6, [
      update.overallCorrectRate,
      ...CATEGORY_NAMES.map((categoryName) => formatCategoryCell(update.categoryScores, categoryName)),
    ]);
    setRowValues(SHEET_NAMES.examResult, rowNumber, 13, [
      update.answerDetailsJson,
      ...toDescriptiveScoreCells(update.descriptiveScoreCells),
    ]);
  });
};

/** 記述式採点列（N〜T列）に、まだ DESCRIPTIVE_SCORING_PENDING_MARKER が残っているかを確認する（安価なポーリング用）。 */
export const isDescriptiveScoringPending = (rowNumber: number): boolean =>
  getRowValues(SHEET_NAMES.examResult, rowNumber, 14, DESCRIPTIVE_SCORE_SLOT_COUNT).some(
    (cell) => cell === DESCRIPTIVE_SCORING_PENDING_MARKER,
  );

/** 記述式採点列（N〜T列）を読み取り、採点済みの設問はパースして返す（未使用・未採点の枠は null）。 */
export const readDescriptiveScoreCells = (rowNumber: number): (DescriptiveScoreSlot | null)[] =>
  getRowValues(SHEET_NAMES.examResult, rowNumber, 14, DESCRIPTIVE_SCORE_SLOT_COUNT).map((cell) => {
    if (typeof cell !== 'string' || cell.trim() === '' || cell === DESCRIPTIVE_SCORING_PENDING_MARKER) {
      return null;
    }
    return JSON.parse(cell) as DescriptiveScoreSlot;
  });
