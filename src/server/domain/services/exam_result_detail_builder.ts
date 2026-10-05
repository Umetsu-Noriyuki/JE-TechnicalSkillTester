import type { ExamResultDetail } from '../../../shared/types/exam_result_detail';
import type { ParsedExamResultRow } from '../models/exam_result_row';
import { aggregateScores, type QuestionScoreEntry } from './scorer';

/**
 * 「受験結果」シートの1行（構造化済み）から、閲覧画面・採点結果画面・PDF出力で共通利用する
 * 詳細情報を組み立てる（15-5章）。総合正解率・分野別正解率は、G〜K列（表示用に整形済みの文字列）
 * ではなくM列（回答詳細）から都度再集計し、表示用フォーマットに依存しない唯一の正とする。
 */
export const buildExamResultDetail = (row: ParsedExamResultRow): ExamResultDetail => {
  const scoreEntries: QuestionScoreEntry[] = row.answerDetails.map((detail) => ({
    category: detail.category,
    score: detail.score,
    isDescriptiveSubmitted: detail.format === 'text' ? detail.answerContent.trim() !== '' : undefined,
  }));
  const aggregated = aggregateScores(scoreEntries);

  return {
    rowNumber: row.rowNumber,
    recordedAt: row.recordedAt.toISOString(),
    roleLabel: row.roleLabel,
    name: row.name,
    employeeNumber: row.employeeNumber,
    department: row.department,
    overallCorrectRate: aggregated.overallCorrectRate,
    durationText: row.durationText,
    categoryScores: aggregated.categoryScores,
    totalScore: aggregated.totalScore,
    questionCount: aggregated.questionCount,
    answerDetails: row.answerDetails,
  };
};
