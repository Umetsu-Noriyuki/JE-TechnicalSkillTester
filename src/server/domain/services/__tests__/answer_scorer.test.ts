import { describe, expect, test } from 'vitest';
import type { Question } from '../../models/question';
import { buildQuestionAnswerPairs } from '../answer_scorer';

const choiceQuestion: Question = {
  id: 'q1',
  category: 'コーディング',
  subCategory: 'if文の条件式',
  format: 'choice',
  text: '選択式の問題文',
  choices: ['A', 'B', 'C', 'D'],
  correctChoiceNumber: 1,
};

const textQuestion: Question = {
  id: 'q2',
  category: 'SQL',
  subCategory: '集計',
  format: 'text',
  text: '記述式の問題文',
  modelAnswer: '模範回答',
};

describe('buildQuestionAnswerPairs', () => {
  test('questionIdで問題マスタと回答を突き合わせ、送信された順序で組を返す', () => {
    const pairs = buildQuestionAnswerPairs(
      [choiceQuestion, textQuestion],
      [
        { questionId: 'q2', descriptiveAnswer: '回答内容' },
        { questionId: 'q1', selectedChoiceNumber: 1 },
      ],
    );

    expect(pairs).toEqual([
      { question: textQuestion, answer: { questionId: 'q2', descriptiveAnswer: '回答内容' } },
      { question: choiceQuestion, answer: { questionId: 'q1', selectedChoiceNumber: 1 } },
    ]);
  });

  test('問題マスタに存在しないquestionIdの回答は無視する', () => {
    const pairs = buildQuestionAnswerPairs(
      [choiceQuestion],
      [
        { questionId: 'q1', selectedChoiceNumber: 1 },
        { questionId: 'unknown' },
      ],
    );

    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.question.id).toBe('q1');
  });

  test('回答が空配列の場合は空配列を返す', () => {
    expect(buildQuestionAnswerPairs([choiceQuestion], [])).toEqual([]);
  });
});
