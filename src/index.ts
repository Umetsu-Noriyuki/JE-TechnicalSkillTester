import { doGet as doGetImpl } from './server/entry_points/do_get';
import { getDescriptiveScoringResult as getDescriptiveScoringResultImpl } from './server/entry_points/get_descriptive_scoring_result';
import { getDescriptiveScoringStatus as getDescriptiveScoringStatusImpl } from './server/entry_points/get_descriptive_scoring_status';
import { getQuizQuestions as getQuizQuestionsImpl } from './server/entry_points/get_quiz_questions';
import { include as includeImpl } from './server/entry_points/include';
import { scoreDescriptiveQuestions as scoreDescriptiveQuestionsImpl } from './server/entry_points/score_descriptive_questions';
import { submitResult as submitResultImpl } from './server/entry_points/submit_result';
import type { AnswerPayload } from './shared/types/answer_payload';
import type { DescriptiveScoringPollStatus, DescriptiveScoringResult } from './shared/types/descriptive_scoring';
import type { QuizQuestion } from './shared/types/quiz_question';
import type { SubmitResultResponse } from './shared/types/submit_result_response';

/**
 * GASのグローバル関数として認識させるためのエントリーポイント。
 *
 * google.script.run（および「実行する関数」の選択リスト）は、サーバー側ファイルの
 * ソースを解析してトップレベルの `function 名前(...) {}` 宣言を検出することで
 * 呼び出し可能な関数を認識する。`globalThis.foo = foo` のような実行時の代入や、
 * IIFEでスコープが1段ネストした状態（Rollupの iife 出力形式）では認識されない。
 * そのため、ここでは各実装（アロー関数）をラップするトップレベルの function 宣言を
 * 用意する。doGet はGASのWebリクエストルーティングが直接globalThisを参照するため
 * 本来この制約を受けないが、一貫性のためここに含める。
 */

function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  return doGetImpl(e);
}

function include(filename: string, data?: Readonly<Record<string, unknown>>): string {
  return includeImpl(filename, data);
}

function getQuizQuestions(role: string, name: string): QuizQuestion[] {
  return getQuizQuestionsImpl(role, name);
}

function submitResult(payload: AnswerPayload): SubmitResultResponse {
  return submitResultImpl(payload);
}

function scoreDescriptiveQuestions(resultId: number, payload: AnswerPayload): void {
  return scoreDescriptiveQuestionsImpl(resultId, payload);
}

function getDescriptiveScoringStatus(resultId: number): DescriptiveScoringPollStatus {
  return getDescriptiveScoringStatusImpl(resultId);
}

function getDescriptiveScoringResult(resultId: number, payload: AnswerPayload): DescriptiveScoringResult {
  return getDescriptiveScoringResultImpl(resultId, payload);
}
