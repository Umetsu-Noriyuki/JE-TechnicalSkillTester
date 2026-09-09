import type { AnswerPayload } from '../../shared/types/answer_payload';
import { buildChoiceAnswerDetail, buildDescriptiveAnswerDetail, type AnswerDetail } from '../domain/services/answer_detail_builder';
import { buildQuestionAnswerPairs } from '../domain/services/answer_scorer';
import { scoreDescriptiveAnswersBatch } from '../domain/services/descriptive_scorer';
import { aggregateScores, scoreChoiceAnswer, type QuestionScoreEntry } from '../domain/services/scorer';
import type { DescriptiveScoreCell } from '../domain/models/exam_result_record';
import { findAllQuestions } from '../repositories/question_repository';
import { updateExamResultAfterDescriptiveScoring } from '../repositories/result_repository';

/**
 * submitResult が即座に返却した後、クライアントから google.script.run で呼び出される
 * バックグラウンド処理（10-1章）。記述式問題をまとめて1回のGeminiリクエストで採点し、
 * 選択式の採点結果と合わせた最終的な採点結果を「受験結果」シートの該当行（resultId）へ反映する。
 *
 * クライアントとの接続が途中で切れても（画面を閉じても）、GASのサーバー側実行はクライアントの
 * 接続状態と独立して継続するため、このバックグラウンド採点・シートへの記録処理は最後まで実行される。
 */
export const scoreDescriptiveQuestions = (resultId: number, payload: AnswerPayload): void => {
  const allQuestions = findAllQuestions();
  const pairs = buildQuestionAnswerPairs(allQuestions, payload.answers);

  const choiceScoreEntries: QuestionScoreEntry[] = [];
  const textPairs = pairs.filter(({ question }) => question.format === 'text');

  for (const { question, answer } of pairs) {
    if (question.format === 'choice') {
      choiceScoreEntries.push({
        category: question.category,
        score: scoreChoiceAnswer(question.correctChoiceNumber, answer.selectedChoiceNumber),
      });
    }
  }

  const descriptiveResults = scoreDescriptiveAnswersBatch(
    textPairs.map(({ question, answer }) => ({
      questionId: question.id,
      question: question.text,
      sampleAnswer: question.modelAnswer ?? '',
      studentAnswer: answer.descriptiveAnswer ?? '',
    })),
  );
  const descriptiveResultByQuestionId = new Map(descriptiveResults.map((result) => [result.questionId, result]));

  const descriptiveScoreEntries: QuestionScoreEntry[] = [];
  const descriptiveScoreCells: DescriptiveScoreCell[] = [];

  for (const { question, answer } of textPairs) {
    const result = descriptiveResultByQuestionId.get(question.id);
    if (result === undefined) {
      throw new Error(`記述式の採点結果が見つかりません: ${question.id}`);
    }
    const studentAnswer = answer.descriptiveAnswer ?? '';
    descriptiveScoreEntries.push({
      category: question.category,
      score: result.score,
      isDescriptiveSubmitted: studentAnswer.trim() !== '',
    });
    descriptiveScoreCells.push({
      questionId: question.id,
      studentAnswer,
      score: result.score,
      referenceAnswer: question.modelAnswer ?? '',
      feedback: result.feedback,
    });
  }

  const finalScoringResult = aggregateScores([...choiceScoreEntries, ...descriptiveScoreEntries]);

  const answerDetails: AnswerDetail[] = pairs.map(({ question, answer }) => {
    if (question.format === 'choice') {
      return buildChoiceAnswerDetail(question, answer, scoreChoiceAnswer(question.correctChoiceNumber, answer.selectedChoiceNumber));
    }
    const result = descriptiveResultByQuestionId.get(question.id);
    if (result === undefined) {
      throw new Error(`記述式の採点結果が見つかりません: ${question.id}`);
    }
    return buildDescriptiveAnswerDetail(question, answer, result.score, result.feedback);
  });

  updateExamResultAfterDescriptiveScoring(resultId, {
    overallCorrectRate: finalScoringResult.overallCorrectRate,
    categoryScores: finalScoringResult.categoryScores,
    answerDetailsJson: JSON.stringify(answerDetails),
    descriptiveScoreCells,
  });
};
