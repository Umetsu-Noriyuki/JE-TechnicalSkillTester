import type { ExamineeRole } from './types/examinee_role';

/** 制限時間（秒）（9-1章） */
export const EXAM_DURATION_SECONDS = 30 * 60;

/** 出題総数（7-2章） */
export const TOTAL_QUESTION_COUNT = 30;

/** 区分ごとの抽出数（7-2章） */
export const CATEGORY_QUOTA = 6;

/** 残り時間の警告表示閾値（秒）（9-2章） */
export const REMAINING_TIME_WARNING_SECONDS = 5 * 60;

export const ROLE_LABELS: Readonly<Record<ExamineeRole, string>> = {
  applicant: '入社希望者',
  newhire: '未経験の新入社員',
  junior: '入社3年目までの社員',
};
