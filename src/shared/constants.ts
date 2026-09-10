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

/**
 * 受験許可チェック（入社希望者のみ、6-3章）に落ちた際に getQuizQuestions がスローするエラーの
 * メッセージ本文。クライアントはこの値と一致するかどうかで、通信エラー等の他の失敗と区別する。
 * 表示用の氏名（未加工の入力値）は、サーバーへ送らずクライアント側の入力値をそのまま使う。
 */
export const PERMISSION_DENIED_ERROR_MESSAGE = 'PERMISSION_DENIED';

/**
 * 閲覧画面（15章）の検索・詳細取得関数が、Access Keyの検証に失敗した際にスローするエラーの
 * メッセージ本文。クライアントはこの値と一致するかどうかで、通信エラー等の他の失敗と区別する。
 */
export const VIEWER_ACCESS_KEY_INVALID_ERROR_MESSAGE = 'VIEWER_ACCESS_KEY_INVALID';
