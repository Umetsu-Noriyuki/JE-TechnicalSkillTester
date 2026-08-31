import type { AnswerPayload } from '../../shared/types/answer_payload';
import type { QuizQuestion } from '../../shared/types/quiz_question';
import type { ScoringResult } from '../../shared/types/scoring_result';

interface GoogleScriptRun {
  withSuccessHandler(callback: (value: unknown) => void): GoogleScriptRun;
  withFailureHandler(callback: (error: Error) => void): GoogleScriptRun;
  getQuizQuestions(role: string): void;
  submitResult(payload: AnswerPayload): void;
}

declare const google: { script: { run: GoogleScriptRun } };

/**
 * google.script.run（コールバック形式）をPromiseベースでラップする。
 * サーバー側 getQuizQuestions() / submitResult() の戻り値型はそれぞれ QuizQuestion[] /
 * ScoringResult で保証されているため、ここでのキャストは同一コードベース内の型契約に
 * 基づく安全なものである。
 */
export const fetchQuizQuestions = (role: string): Promise<QuizQuestion[]> =>
  new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((value) => resolve(value as QuizQuestion[]))
      .withFailureHandler((error) => reject(error))
      .getQuizQuestions(role);
  });

/** 「採点」／「回答終了」ボタン押下時に回答一式を送信し、採点結果を受け取る（10-1章）。 */
export const submitExamResult = (payload: AnswerPayload): Promise<ScoringResult> =>
  new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((value) => resolve(value as ScoringResult))
      .withFailureHandler((error) => reject(error))
      .submitResult(payload);
  });
