import type { QuizQuestion } from '../../shared/types/quiz_question';

interface GoogleScriptRun {
  withSuccessHandler(callback: (value: unknown) => void): GoogleScriptRun;
  withFailureHandler(callback: (error: Error) => void): GoogleScriptRun;
  getQuizQuestions(role: string): void;
}

declare const google: { script: { run: GoogleScriptRun } };

/**
 * google.script.run（コールバック形式）をPromiseベースでラップする。
 * サーバー側 getQuizQuestions() の戻り値型は QuizQuestion[] で保証されているため、
 * ここでのキャストは同一コードベース内の型契約に基づく安全なものである。
 */
export const fetchQuizQuestions = (role: string): Promise<QuizQuestion[]> =>
  new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((value) => resolve(value as QuizQuestion[]))
      .withFailureHandler((error) => reject(error))
      .getQuizQuestions(role);
  });
