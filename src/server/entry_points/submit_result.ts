import { ROLE_LABELS } from '../../shared/constants';
import type { AnswerPayload, QuestionAnswer } from '../../shared/types/answer_payload';
import { isExamineeRole } from '../../shared/types/examinee_role';
import type { ScoringResult } from '../../shared/types/scoring_result';
import {
  buildChoiceAnswerDetail,
  buildDescriptiveAnswerDetail,
  type AnswerDetail,
} from '../domain/services/answer_detail_builder';
import { scoreDescriptiveAnswers } from '../domain/services/descriptive_scorer';
import { aggregateScores, scoreChoiceAnswer, type QuestionScoreEntry } from '../domain/services/scorer';
import type { ExamResultRecord } from '../domain/models/exam_result_record';
import type { Question } from '../domain/models/question';
import { findAllQuestions } from '../repositories/question_repository';
import { appendExamResult } from '../repositories/result_repository';

interface QuestionAnswerPair {
  question: Question;
  answer: QuestionAnswer;
}

interface ScoredAnswer {
  scoreEntry: QuestionScoreEntry;
  detail: AnswerDetail;
}

/**
 * 「採点」／「回答終了」ボタン押下時に google.script.run から呼び出される（9-4章）。
 * 問題マスタと突き合わせて採点・回答詳細の記録まで行い、採点結果をクライアントへ返す
 * （画面に表示するかどうかは受験者区分に応じてクライアント側で判断する、10-4章）。
 *
 * 記述式問題は1問ずつ直列でGemini APIへ問い合わせると待ち時間が積み上がるため、
 * 全問まとめて scoreDescriptiveAnswers（内部で並列リクエスト）へ渡してから、
 * 選択式の採点結果と合わせて組み立てる（12章：外部API依存対策）。
 */
export const submitResult = (payload: AnswerPayload): ScoringResult => {
  if (!isExamineeRole(payload.examinee.role)) {
    throw new Error(`不正な受験者区分です: ${String(payload.examinee.role)}`);
  }

  const allQuestions = findAllQuestions();
  const questionById = new Map(allQuestions.map((question) => [question.id, question]));

  const pairs: QuestionAnswerPair[] = [];
  for (const answer of payload.answers) {
    const question = questionById.get(answer.questionId);
    if (question !== undefined) {
      pairs.push({ question, answer });
    }
  }

  const descriptivePairs = pairs.filter((pair) => pair.question.format === 'text');
  const descriptiveScores = scoreDescriptiveAnswers(
    descriptivePairs.map((pair) => ({
      question: pair.question.text,
      sampleAnswer: pair.question.modelAnswer ?? '',
      studentAnswer: pair.answer.descriptiveAnswer ?? '',
    })),
  );
  const descriptiveScoreByQuestionId = new Map(
    descriptivePairs.map((pair, index) => [pair.question.id, descriptiveScores[index]]),
  );

  const scoredAnswers: ScoredAnswer[] = pairs.map(({ question, answer }) => {
    if (question.format === 'choice') {
      const score = scoreChoiceAnswer(question.correctChoiceNumber, answer.selectedChoiceNumber);
      return {
        scoreEntry: { category: question.category, score },
        detail: buildChoiceAnswerDetail(question, answer, score),
      };
    }

    const studentAnswer = answer.descriptiveAnswer ?? '';
    const result = descriptiveScoreByQuestionId.get(question.id);
    if (result === undefined) {
      throw new Error(`記述式の採点結果が見つかりません: ${question.id}`);
    }
    return {
      scoreEntry: {
        category: question.category,
        score: result.score,
        isDescriptiveSubmitted: studentAnswer.trim() !== '',
      },
      detail: buildDescriptiveAnswerDetail(question, answer, result.score, result.feedback),
    };
  });

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
