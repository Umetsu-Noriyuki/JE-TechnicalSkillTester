import { describe, expect, test } from 'vitest';
import type { Question } from '../../models/question';
import { selectExamQuestions } from '../question_selector';

const buildChoiceQuestion = (id: string, category: string): Question => ({
  id,
  category,
  subCategory: 'サブ区分',
  format: 'choice',
  text: `${id}の問題文`,
  choices: ['A', 'B', 'C', 'D'],
  correctChoiceNumber: 1,
});

const buildTextQuestion = (id: string, category: string): Question => ({
  id,
  category,
  subCategory: 'サブ区分',
  format: 'text',
  text: `${id}の問題文`,
  modelAnswer: '模範回答',
});

describe('selectExamQuestions', () => {
  test('区分内の問題数が抽出数(6問)以下の場合、全問を採用する', () => {
    const questions = Array.from({ length: 6 }, (_, i) => buildChoiceQuestion(`sql-${i}`, 'SQL'));

    const result = selectExamQuestions(questions);

    expect(result).toHaveLength(6);
    expect([...result].map((q) => q.id).sort()).toEqual(questions.map((q) => q.id).sort());
  });

  test('区分内の問題数が抽出数を超え記述式が存在する場合、構成比に応じて按分する（7-3章の例）', () => {
    const textQuestions = Array.from({ length: 11 }, (_, i) =>
      buildTextQuestion(`cod-text-${i}`, 'コーディング'),
    );
    const choiceQuestions = Array.from({ length: 28 }, (_, i) =>
      buildChoiceQuestion(`cod-choice-${i}`, 'コーディング'),
    );

    const result = selectExamQuestions([...textQuestions, ...choiceQuestions]);

    expect(result).toHaveLength(6);
    expect(result.filter((q) => q.format === 'text')).toHaveLength(2);
    expect(result.filter((q) => q.format === 'choice')).toHaveLength(4);
  });

  test('記述式が存在しない区分は、選択式のみから抽出数分を抽出する（行動指針の例）', () => {
    const questions = Array.from({ length: 15 }, (_, i) => buildChoiceQuestion(`beh-${i}`, '行動指針'));

    const result = selectExamQuestions(questions);

    expect(result).toHaveLength(6);
    expect(result.every((q) => q.format === 'choice')).toBe(true);
  });

  test('複数区分をまたいで、各区分の抽出結果を合算する', () => {
    const sql = Array.from({ length: 6 }, (_, i) => buildChoiceQuestion(`sql-${i}`, 'SQL'));
    const behavior = Array.from({ length: 15 }, (_, i) => buildChoiceQuestion(`beh-${i}`, '行動指針'));

    const result = selectExamQuestions([...sql, ...behavior]);

    expect(result).toHaveLength(12);
    expect(result.filter((q) => q.category === 'SQL')).toHaveLength(6);
    expect(result.filter((q) => q.category === '行動指針')).toHaveLength(6);
  });
});
