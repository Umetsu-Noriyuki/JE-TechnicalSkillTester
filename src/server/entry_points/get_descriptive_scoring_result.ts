import type { AnswerPayload } from '../../shared/types/answer_payload';
import type { DescriptiveScoringItem, DescriptiveScoringResult } from '../../shared/types/descriptive_scoring';
import { buildQuestionAnswerPairs } from '../domain/services/answer_scorer';
import { aggregateScores, scoreChoiceAnswer, type QuestionScoreEntry } from '../domain/services/scorer';
import { findAllQuestions } from '../repositories/question_repository';
import { readDescriptiveScoreCells } from '../repositories/result_repository';

/**
 * 記述式バックグラウンド採点の完了後、クライアントが1回だけ呼び出す最終結果取得（10-1章）。
 * 記述式の採点結果は「受験結果」シートのN〜T列（採点済みJSON）から読み取り、選択式は
 * その場で再採点（決定的で安価な処理のため副作用なく再計算できる）したうえで、
 * 選択式・記述式を合わせた最終的な採点結果を組み立てて返す。
 */
export const getDescriptiveScoringResult = (resultId: number, payload: AnswerPayload): DescriptiveScoringResult => {
  const allQuestions = findAllQuestions();
  const pairs = buildQuestionAnswerPairs(allQuestions, payload.answers);
  const textPairs = pairs.filter(({ question }) => question.format === 'text');

  const slots = readDescriptiveScoreCells(resultId);

  const choiceScoreEntries: QuestionScoreEntry[] = pairs
    .filter(({ question }) => question.format === 'choice')
    .map(({ question, answer }) => ({
      category: question.category,
      score: scoreChoiceAnswer(question.correctChoiceNumber, answer.selectedChoiceNumber),
    }));

  const items: DescriptiveScoringItem[] = [];
  const descriptiveScoreEntries: QuestionScoreEntry[] = [];

  textPairs.forEach(({ question }, index) => {
    const slot = slots[index];
    if (slot === null || slot === undefined) {
      throw new Error(`記述式の採点結果が見つかりません: ${question.id}`);
    }
    items.push({
      questionId: slot.questionId,
      studentAnswer: slot.studentAnswer,
      score: slot.score,
      referenceAnswer: slot.referenceAnswer,
      feedback: slot.feedback,
    });
    descriptiveScoreEntries.push({
      category: question.category,
      score: slot.score,
      isDescriptiveSubmitted: slot.studentAnswer.trim() !== '',
    });
  });

  const scoringResult = aggregateScores([...choiceScoreEntries, ...descriptiveScoreEntries]);

  return { items, scoringResult };
};
