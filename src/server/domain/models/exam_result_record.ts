import type { CategoryScore } from '../../../shared/types/scoring_result';

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
}
