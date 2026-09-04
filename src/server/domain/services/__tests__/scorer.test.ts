import { describe, expect, test } from 'vitest';
import { aggregateScores, scoreChoiceAnswer, type QuestionScoreEntry } from '../scorer';

describe('scoreChoiceAnswer', () => {
  test('選択した番号が正解番号と一致する場合は100点', () => {
    expect(scoreChoiceAnswer(2, 2)).toBe(100);
  });

  test('選択した番号が正解番号と一致しない場合は0点', () => {
    expect(scoreChoiceAnswer(2, 1)).toBe(0);
  });

  test('未回答（selectedChoiceNumberがundefined）の場合は0点', () => {
    expect(scoreChoiceAnswer(2, undefined)).toBe(0);
  });
});

describe('aggregateScores', () => {
  test('区分ごとの得点合計・出題数から正解率を四捨五入して算出する', () => {
    const entries: QuestionScoreEntry[] = [
      { category: 'コーディング', score: 100 },
      { category: 'コーディング', score: 0 },
      { category: 'コーディング', score: 80, isDescriptiveSubmitted: true },
    ];

    const result = aggregateScores(entries);

    const coding = result.categoryScores.find((c) => c.categoryName === 'コーディング');
    expect(coding).toEqual({
      categoryName: 'コーディング',
      questionCount: 3,
      totalScore: 180,
      correctRate: 60, // 180/3 = 60
      descriptiveSubmittedCount: 1,
    });
  });

  test('総合正解率は全問題（選択式＋記述式）の得点合計÷出題総数を四捨五入する', () => {
    const entries: QuestionScoreEntry[] = [
      { category: 'コーディング', score: 100 },
      { category: 'コーディング', score: 100 },
      { category: 'SQL', score: 0 },
    ];

    const result = aggregateScores(entries);

    expect(result.questionCount).toBe(3);
    expect(result.totalScore).toBe(200);
    expect(result.overallCorrectRate).toBe(67); // 200/3 = 66.67 -> 67
  });

  test('複数区分をまたいで区分ごとに正しく集計する', () => {
    const entries: QuestionScoreEntry[] = [
      { category: 'コーディング', score: 100 },
      { category: 'SQL', score: 50 },
      { category: 'SQL', score: 100 },
    ];

    const result = aggregateScores(entries);

    expect(result.categoryScores.find((c) => c.categoryName === 'コーディング')).toMatchObject({
      questionCount: 1,
      totalScore: 100,
      correctRate: 100,
    });
    expect(result.categoryScores.find((c) => c.categoryName === 'SQL')).toMatchObject({
      questionCount: 2,
      totalScore: 150,
      correctRate: 75,
    });
  });

  test('出題が1問もない場合、正解率は0とする（0除算を避ける）', () => {
    const result = aggregateScores([]);

    expect(result.overallCorrectRate).toBe(0);
    expect(result.questionCount).toBe(0);
    expect(result.totalScore).toBe(0);
    expect(result.categoryScores).toEqual([]);
  });

  test('isDescriptiveSubmittedを指定しない選択式は記述式提出数にカウントされない', () => {
    const entries: QuestionScoreEntry[] = [
      { category: 'コーディング', score: 100 },
      { category: 'コーディング', score: 0, isDescriptiveSubmitted: false },
    ];

    const result = aggregateScores(entries);

    expect(result.categoryScores[0]?.descriptiveSubmittedCount).toBe(0);
  });
});
