import type { ExamineeRole } from './examinee_role';

export interface QuestionAnswer {
  questionId: string;
  /** 選択式のみ。QuizChoice.choiceNumber と対応する元の選択肢番号。 */
  selectedChoiceNumber?: number;
  /** 記述式のみ。 */
  descriptiveAnswer?: string;
}

export interface ExamineeInfo {
  role: ExamineeRole;
  name: string;
  /** role が 'applicant' の場合は未設定。 */
  employeeNumber?: string;
  /** role が 'applicant' の場合は未設定。 */
  department?: string;
}

/**
 * submitResult(payload) が受け取る回答データ（10-1章）。クライアントが送信するデータのため
 * shared/types に置く（server/domain/models は正解情報などクライアントに渡さない内部専用の型）。
 */
export interface AnswerPayload {
  examinee: ExamineeInfo;
  answers: readonly QuestionAnswer[];
  elapsedSeconds: number;
  isTimedOut: boolean;
  /**
   * 受験中に抑止した禁止操作（コピー・貼り付け等）の回数（9-5章）。「受験結果」シートU列へ記録する。
   * クライアントで集計した値のため、サーバー側で0以上の整数であることを検証する。
   */
  prohibitedOperationCount: number;
}
