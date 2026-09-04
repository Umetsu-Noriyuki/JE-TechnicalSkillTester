import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Question } from '../../models/question';
import { toQuizQuestion } from '../choice_shuffler';

const choiceQuestion: Question = {
  id: 'cod-if-01',
  category: 'コーディング',
  subCategory: 'if文の条件式',
  format: 'choice',
  text: '問題文',
  choices: ['A', 'B', 'C', 'D'],
  correctChoiceNumber: 2,
};

const textQuestion: Question = {
  id: 'sql-01',
  category: 'SQL',
  subCategory: '集計',
  format: 'text',
  text: '問題文',
  modelAnswer: '模範回答',
};

describe('toQuizQuestion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('記述式の問題は選択肢を持たないQuizQuestionに変換する', () => {
    const result = toQuizQuestion(textQuestion);

    expect(result).toEqual({ id: 'sql-01', format: 'text', text: '問題文' });
  });

  test('選択式の問題は、各選択肢に元の番号(choiceNumber)を保持したまま変換する', () => {
    const result = toQuizQuestion(choiceQuestion);

    expect(result.id).toBe('cod-if-01');
    expect(result.format).toBe('choice');
    expect(result.choices).toHaveLength(4);

    const textByChoiceNumber = new Map(result.choices?.map((choice) => [choice.choiceNumber, choice.text]));
    expect(textByChoiceNumber.get(1)).toBe('A');
    expect(textByChoiceNumber.get(2)).toBe('B');
    expect(textByChoiceNumber.get(3)).toBe('C');
    expect(textByChoiceNumber.get(4)).toBe('D');
  });

  test('Math.randomの結果に応じて選択肢の表示順が入れ替わる', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = toQuizQuestion(choiceQuestion);

    expect(result.choices?.map((choice) => choice.text)).toEqual(['B', 'C', 'D', 'A']);
  });
});
