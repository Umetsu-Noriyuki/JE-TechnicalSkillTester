import { ROLE_LABELS } from '../../shared/constants';
import type { AnswerPayload, QuestionAnswer } from '../../shared/types/answer_payload';
import { isExamineeRole } from '../../shared/types/examinee_role';
import type { ScoringResult } from '../../shared/types/scoring_result';
import { buildChoiceAnswerDetail, buildDescriptiveAnswerDetail, type AnswerDetail } from '../domain/services/answer_detail_builder';
import { scoreDescriptiveAnswer } from '../domain/services/descriptive_scorer';
import { aggregateScores, scoreChoiceAnswer, type QuestionScoreEntry } from '../domain/services/scorer';
import type { ExamResultRecord } from '../domain/models/exam_result_record';
import type { Question } from '../domain/models/question';
import { findAllQuestions } from '../repositories/question_repository';
import { appendExamResult } from '../repositories/result_repository';

interface ScoredAnswer {
  scoreEntry: QuestionScoreEntry;
  detail: AnswerDetail;
}

/**
 * 1問分の採点を行う（10章）。選択式は正誤判定のみ（純粋）、記述式はGemini APIによる
 * 採点（副作用あり）を行う。
 */
const scoreAnswer = (question: Question, answer: QuestionAnswer): ScoredAnswer => {
  if (question.format === 'choice') {
    const score = scoreChoiceAnswer(question.correctChoiceNumber, answer.selectedChoiceNumber);
    return {
      scoreEntry: { category: question.category, score },
      detail: buildChoiceAnswerDetail(question, answer, score),
    };
  }

  const studentAnswer = answer.descriptiveAnswer ?? '';
  const { score, feedback } = scoreDescriptiveAnswer(question.text, question.modelAnswer ?? '', studentAnswer);
  return {
    scoreEntry: { category: question.category, score, isDescriptiveSubmitted: studentAnswer.trim() !== '' },
    detail: buildDescriptiveAnswerDetail(question, answer, score, feedback),
  };
};

/**
 * 「採点」／「回答終了」ボタン押下時に google.script.run から呼び出される（9-4章）。
 * 問題マスタと突き合わせて採点・回答詳細の記録まで行い、採点結果をクライアントへ返す
 * （画面に表示するかどうかは受験者区分に応じてクライアント側で判断する、10-4章）。
 */
export const submitResult = (payload: AnswerPayload): ScoringResult => {
  if (!isExamineeRole(payload.examinee.role)) {
    throw new Error(`不正な受験者区分です: ${String(payload.examinee.role)}`);
  }

  const allQuestions = findAllQuestions();
  const questionById = new Map(allQuestions.map((question) => [question.id, question]));

  const scoredAnswers: ScoredAnswer[] = [];
  for (const answer of payload.answers) {
    const question = questionById.get(answer.questionId);
    if (question !== undefined) {
      scoredAnswers.push(scoreAnswer(question, answer));
    }
  }

  const scoringResult = aggregateScores(scoredAnswers.map((entry) => entry.scoreEntry));
  const answerDetails = scoredAnswers.map((entry) => entry.detail);

  const record: ExamResultRecord = {
    recordedAt: new Date(),
    roleLabel: ROLE_LABELS[payload.examinee.role],
    name: payload.examinee.name,
    employeeNumber: payload.examinee.employeeNumber ?? '',
    department: payload.examinee.department ?? '',
    overallCorrectRate: scoringResult.overallCorrectRate,
    categoryScores: scoringResult.categoryScores,
    elapsedSeconds: payload.elapsedSeconds,
    isTimedOut: payload.isTimedOut,
    answerDetailsJson: JSON.stringify(answerDetails),
  };

  appendExamResult(record);

  return scoringResult;
};
