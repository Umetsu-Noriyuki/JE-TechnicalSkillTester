import type { AnswerPayload } from '../../shared/types/answer_payload';
import type { DescriptiveScoringPollStatus, DescriptiveScoringResult } from '../../shared/types/descriptive_scoring';
import type { QuizQuestion } from '../../shared/types/quiz_question';
import type { SubmitResultResponse } from '../../shared/types/submit_result_response';

interface GoogleScriptRun {
  withSuccessHandler(callback: (value: unknown) => void): GoogleScriptRun;
  withFailureHandler(callback: (error: Error) => void): GoogleScriptRun;
  getQuizQuestions(role: string, name: string): void;
  submitResult(payload: AnswerPayload): void;
  scoreDescriptiveQuestions(resultId: number, payload: AnswerPayload): void;
  getDescriptiveScoringStatus(resultId: number): void;
  getDescriptiveScoringResult(resultId: number, payload: AnswerPayload): void;
}

declare const google: { script: { run: GoogleScriptRun } };

/**
 * google.script.run（コールバック形式）をPromiseベースでラップする。
 * サーバー側関数の戻り値型はそれぞれ対応する shared/types で保証されているため、
 * ここでのキャストは同一コードベース内の型契約に基づく安全なものである。
 */
export const fetchQuizQuestions = (role: string, name: string): Promise<QuizQuestion[]> =>
  new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((value) => resolve(value as QuizQuestion[]))
      .withFailureHandler((error) => reject(error))
      .getQuizQuestions(role, name);
  });

/**
 * 「採点」／「回答終了」ボタン押下時に回答一式を送信する（10-1章）。選択式の採点状況・
 * 記述式の提出状況のみを集計した暫定の採点結果と、記述式のバックグラウンド採点・ポーリングに
 * 使う resultId を受け取る高速な呼び出し。
 */
export const submitExamResult = (payload: AnswerPayload): Promise<SubmitResultResponse> =>
  new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((value) => resolve(value as SubmitResultResponse))
      .withFailureHandler((error) => reject(error))
      .submitResult(payload);
  });

/**
 * 記述式問題のバックグラウンド採点を開始する（10-1章）。GAS側の実行はクライアントとの
 * 接続と独立して継続するため、呼び出し元は結果を待たずに次の処理（ポーリング開始）へ進んでよい。
 */
export const startDescriptiveScoring = (resultId: number, payload: AnswerPayload): Promise<void> =>
  new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(() => resolve())
      .withFailureHandler((error) => reject(error))
      .scoreDescriptiveQuestions(resultId, payload);
  });

/** 記述式バックグラウンド採点の状況を確認する（ポーリング用の軽量な呼び出し）。 */
export const fetchDescriptiveScoringStatus = (resultId: number): Promise<DescriptiveScoringPollStatus> =>
  new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((value) => resolve(value as DescriptiveScoringPollStatus))
      .withFailureHandler((error) => reject(error))
      .getDescriptiveScoringStatus(resultId);
  });

/** 記述式バックグラウンド採点の完了後、最終的な採点結果を1回だけ取得する。 */
export const fetchDescriptiveScoringResult = (
  resultId: number,
  payload: AnswerPayload,
): Promise<DescriptiveScoringResult> =>
  new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((value) => resolve(value as DescriptiveScoringResult))
      .withFailureHandler((error) => reject(error))
      .getDescriptiveScoringResult(resultId, payload);
  });
