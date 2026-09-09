import type { ScoringResult } from './scoring_result';

/** 記述式1問分の採点結果（提出内容・スコア・参考回答・フィードバック）。 */
export interface DescriptiveScoringItem {
  questionId: string;
  studentAnswer: string;
  score: number;
  referenceAnswer: string;
  feedback: string;
}

/** ポーリング用の軽量な状態確認（N〜T列が埋まっているかだけを見る、安価な問い合わせ）。 */
export type DescriptiveScoringPollStatus = 'pending' | 'completed';

/** 採点完了後に1回だけ取得する、記述式の最終結果一式。 */
export interface DescriptiveScoringResult {
  items: readonly DescriptiveScoringItem[];
  /** 選択式＋記述式を含む最終的な採点結果（10-3章）。 */
  scoringResult: ScoringResult;
}
