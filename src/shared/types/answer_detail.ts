/**
 * 設問1問分の回答詳細（11-2章 M列）。「受験結果」シートのM列にJSON文字列として保存され、
 * 閲覧画面（15章）が選択結果の詳細を表示する際に、この形のまま読み戻す契約となる。
 */
export interface AnswerDetail {
  questionId: string;
  category: string;
  subCategory: string;
  format: 'choice' | 'text';
  /** 選択式：選択した選択肢の文言（未回答なら空文字）／記述式：入力内容 */
  answerContent: string;
  /** 0〜100（10-2章）。選択式：正解100点/不正解0点、記述式：Gemini採点結果。 */
  score: number;
  /** 選択式のみ。 */
  isCorrect?: boolean;
  /** 記述式のみ。 */
  modelAnswer?: string;
  /** 記述式のみ。Geminiによる採点フィードバック。 */
  feedback?: string;
}
