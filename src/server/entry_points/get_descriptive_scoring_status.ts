import type { DescriptiveScoringPollStatus } from '../../shared/types/descriptive_scoring';
import { isDescriptiveScoringPending } from '../repositories/result_repository';

/**
 * クライアントが一定間隔でポーリングする、記述式バックグラウンド採点の状況確認（10-1章）。
 * 「受験結果」シートのN〜T列に採点中マーカーが残っているかだけを確認する軽量な処理とし、
 * 採点内容の再計算は行わない（完了後の最終結果取得は get_descriptive_scoring_result.ts で1回だけ行う）。
 */
export const getDescriptiveScoringStatus = (resultId: number): DescriptiveScoringPollStatus =>
  isDescriptiveScoringPending(resultId) ? 'pending' : 'completed';
