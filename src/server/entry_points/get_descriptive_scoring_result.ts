import type { DescriptiveScoringResult } from '../../shared/types/descriptive_scoring';
import { aggregateScores, type QuestionScoreEntry } from '../domain/services/scorer';
import { findExamResultRowByRowNumber } from '../repositories/exam_result_query_repository';

/**
 * 記述式バックグラウンド採点の完了後、クライアントが1回だけ呼び出す最終結果取得（10-1章）。
 * この時点で「受験結果」シートのM列には選択式・記述式すべての最終的な回答詳細が
 * 既に書き込まれているため（score_descriptive_questions.ts）、それをそのまま読み取って返す
 * （閲覧画面の getExamResultDetail と同じ方式。10-3章の集計はここで再計算し、唯一の正とする）。
 */
export const getDescriptiveScoringResult = (resultId: number): DescriptiveScoringResult => {
  const row = findExamResultRowByRowNumber(resultId);
  if (row === null) {
    throw new Error(`受験結果が見つかりません（行番号: ${resultId}）`);
  }

  const scoreEntries: QuestionScoreEntry[] = row.answerDetails.map((detail) => ({
    category: detail.category,
    score: detail.score,
    isDescriptiveSubmitted: detail.format === 'text' ? detail.answerContent.trim() !== '' : undefined,
  }));

  return { answerDetails: row.answerDetails, scoringResult: aggregateScores(scoreEntries) };
};
