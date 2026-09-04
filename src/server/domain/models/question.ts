export type QuestionFormat = 'choice' | 'text';

/**
 * 「問題マスタ」シート1行分の内部表現（7-1章）。正解情報を含むため、クライアントへは
 * そのまま返却せず、shared/types/quiz_question.ts の QuizQuestion に変換して渡す。
 */
export interface Question {
  id: string;
  category: string;
  subCategory: string;
  format: QuestionFormat;
  text: string;
  /** 選択式のみ。マスタ列順（選択肢1〜4）。 */
  choices?: readonly string[];
  /** 選択式のみ。1〜4（マスタの「正解番号」列と同じ1始まり）。 */
  correctChoiceNumber?: number;
  /** 記述式のみ。 */
  modelAnswer?: string;
  note?: string;
}
