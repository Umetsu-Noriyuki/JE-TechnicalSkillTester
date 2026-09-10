import type { AnswerDetail } from '../../../shared/types/answer_detail';

/** 「受験結果」シート1行分を構造化した内部表現（15章、閲覧画面用）。 */
export interface ParsedExamResultRow {
  rowNumber: number;
  recordedAt: Date;
  roleLabel: string;
  name: string;
  employeeNumber: string;
  department: string;
  /** 0〜100（10-3章）。F列の値をそのまま使う（一覧表示用の軽量な値）。 */
  overallCorrectRate: number;
  /** L列の所要時間表示文字列。 */
  durationText: string;
  /** M列をパースした回答詳細。JSONとして解釈できない場合は空配列。 */
  answerDetails: readonly AnswerDetail[];
}
