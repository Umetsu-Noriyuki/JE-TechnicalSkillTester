import type { CategoryScore } from '../../../shared/types/scoring_result';

/** 記述式1問分の採点結果（「受験結果」シートN〜T列の1セル分、11-2章）。 */
export interface DescriptiveScoreSlot {
  questionId: string;
  studentAnswer: string;
  score: number;
  referenceAnswer: string;
  feedback: string;
}

/**
 * 記述式採点列（N〜T列）1セル分の内容。
 * 提出直後はバックグラウンド採点が完了していないため 'pending' を書き込み、
 * 採点完了後に DescriptiveScoreSlot（JSON文字列）で上書きする（10-1章）。
 */
export type DescriptiveScoreCell = DescriptiveScoreSlot | 'pending';

/**
 * 「受験結果」シート1行分の内部表現（11-2章）。
 */
export interface ExamResultRecord {
  recordedAt: Date;
  /** 受験者区分の表示ラベル（shared/constants.ts の ROLE_LABELS）。 */
  roleLabel: string;
  name: string;
  /** 入社希望者の場合は空文字。 */
  employeeNumber: string;
  /** 入社希望者の場合は空文字。 */
  department: string;
  /** 0〜100（10-3章） */
  overallCorrectRate: number;
  categoryScores: readonly CategoryScore[];
  elapsedSeconds: number;
  isTimedOut: boolean;
  /** 各設問の回答詳細をまとめたJSON文字列（11-2章 M列）。 */
  answerDetailsJson: string;
  /**
   * 記述式採点列（N〜T列、11-2章）。出題された記述式問題数分の要素を並べる
   * （出題数が7問未満の場合、残りの列は空欄のままになる）。
   */
  descriptiveScoreCells: readonly DescriptiveScoreCell[];
}
