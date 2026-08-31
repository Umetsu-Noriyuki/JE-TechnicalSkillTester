import { describe, expect, test } from 'vitest';
import type { QuestionAnswer } from '../../models/answer_payload';
import type { Question } from '../../models/question';
import { scoreExam } from '../scorer';

const buildChoiceQuestion = (id: string, category: string, correctChoiceNumber: number): Question => ({
  id,
  category,
  subCategory: 'サブ区分',
  format: 'choice',
  text: `${id}の問題文`,
  choices: ['A', 'B', 'C', 'D'],
  correctChoiceNumber,
});

const buildTextQuestion = (id: string, category: string): Question => ({
  id,
  category,
  subCategory: 'サブ区分',
  format: 'text',
  text: `${id}の問題文`,
  modelAnswer: '模範回答',
});

describe('scoreExam', () => {
  test('選択式は正解番号と一致した場合のみ正解として扱う', () => {
    const questions = [buildChoiceQuestion('q1', 'コーディング', 2), buildChoiceQuestion('q2', 'コーディング', 1)];
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', selectedChoiceNumber: 2 },
      { questionId: 'q2', selectedChoiceNumber: 3 },
    ];

    const result = scoreExam(questions, answers);

    expect(result.choiceQuestionCount).toBe(2);
    expect(result.choiceCorrectCount).toBe(1);
    expect(result.overallCorrectRate).toBe(50);
  });

  test('未回答の選択式は出題数に含めるが正解数には含めない', () => {
    const questions = [buildChoiceQuestion('q1', 'コーディング', 1)];
    const answers: QuestionAnswer[] = [{ questionId: 'q1' }];

    const result = scoreExam(questions, answers);

    expect(result.choiceQuestionCount).toBe(1);
    expect(result.choiceCorrectCount).toBe(0);
  });

  test('記述式は自動採点せず、内容が空でなければ提出数としてカウントする', () => {
    const questions = [buildTextQuestion('q1', 'SQL'), buildTextQuestion('q2', 'SQL')];
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', descriptiveAnswer: '回答内容' },
      { questionId: 'q2', descriptiveAnswer: '   ' },
    ];

    const result = scoreExam(questions, answers);

    expect(result.choiceQuestionCount).toBe(0);
    expect(result.categoryScores[0]).toMatchObject({ categoryName: 'SQL', descriptiveSubmittedCount: 1 });
  });

  test('区分ごとに正解率・出題数・正解数・記述式提出数を集計する', () => {
    const questions = [
      buildChoiceQuestion('cod-1', 'コーディング', 1),
      buildChoiceQuestion('cod-2', 'コーディング', 1),
      buildTextQuestion('cod-3', 'コーディング'),
      buildChoiceQuestion('sql-1', 'SQL', 1),
    ];
    const answers: QuestionAnswer[] = [
      { questionId: 'cod-1', selectedChoiceNumber: 1 },
      { questionId: 'cod-2', selectedChoiceNumber: 2 },
      { questionId: 'cod-3', descriptiveAnswer: '回答' },
      { questionId: 'sql-1', selectedChoiceNumber: 1 },
    ];

    const result = scoreExam(questions, answers);

    expect(result.categoryScores.find((c) => c.categoryName === 'コーディング')).toEqual({
      categoryName: 'コーディング',
      choiceQuestionCount: 2,
      choiceCorrectCount: 1,
      correctRate: 50,
      descriptiveSubmittedCount: 1,
    });
    expect(result.categoryScores.find((c) => c.categoryName === 'SQL')).toEqual({
      categoryName: 'SQL',
      choiceQuestionCount: 1,
      choiceCorrectCount: 1,
      correctRate: 100,
      descriptiveSubmittedCount: 0,
    });
    expect(result.overallCorrectRate).toBe(67);
    expect(result.choiceQuestionCount).toBe(3);
    expect(result.choiceCorrectCount).toBe(2);
  });

  test('問題マスタ（出題済み問題）に存在しないquestionIdの回答は無視する', () => {
    const questions = [buildChoiceQuestion('q1', 'コーディング', 1)];
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', selectedChoiceNumber: 1 },
      { questionId: 'unknown', selectedChoiceNumber: 1 },
    ];

    const result = scoreExam(questions, answers);

    expect(result.choiceQuestionCount).toBe(1);
  });

  test('選択式問題が1問もない場合、正解率は0%とする（0除算を避ける）', () => {
    const questions = [buildTextQuestion('q1', 'SQL')];
    const answers: QuestionAnswer[] = [{ questionId: 'q1', descriptiveAnswer: '回答' }];

    const result = scoreExam(questions, answers);

    expect(result.overallCorrectRate).toBe(0);
  });
});
