import type { AnswerDetail } from './answer_detail';
import type { ScoringResult } from './scoring_result';

/** ポーリング用の軽量な状態確認（N〜T列が埋まっているかだけを見る、安価な問い合わせ）。 */
export type DescriptiveScoringPollStatus = 'pending' | 'completed';

/**
 * 記述式バックグラウンド採点の完了後に1回だけ取得する、最終結果一式（10-1章）。
 * 「受験結果」シートM列から読み取った、選択式・記述式すべての回答詳細をそのまま返す。
 */
export interface DescriptiveScoringResult {
  answerDetails: readonly AnswerDetail[];
  /** 選択式＋記述式を含む最終的な採点結果（10-3章）。 */
  scoringResult: ScoringResult;
}
