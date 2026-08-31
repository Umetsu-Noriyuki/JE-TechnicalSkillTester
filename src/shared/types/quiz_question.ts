export interface QuizChoice {
  /** 問題マスタ上の元の選択肢番号（1〜4）。表示順（シャッフル後）とは独立して保持する。 */
  choiceNumber: number;
  text: string;
}

export interface QuizQuestion {
  id: string;
  format: 'choice' | 'text';
  text: string;
  /** 選択式のみ。表示順はシャッフル済みだが、各要素は元のchoiceNumberを保持する（8章）。 */
  choices?: readonly QuizChoice[];
}
