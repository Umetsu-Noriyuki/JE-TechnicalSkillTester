import { describe, expect, test } from 'vitest';
import type { QuestionAnswer } from '../../../../shared/types/answer_payload';
import type { Question } from '../../models/question';
import { buildChoiceAnswerDetail, buildDescriptiveAnswerDetail } from '../answer_detail_builder';

const choiceQuestion: Question = {
  id: 'q1',
  category: 'コーディング',
  subCategory: 'if文の条件式',
  format: 'choice',
  text: '問題文',
  choices: ['A', 'B', 'C', 'D'],
  correctChoiceNumber: 2,
};

const textQuestion: Question = {
  id: 'q2',
  category: 'SQL',
  subCategory: '集計',
  format: 'text',
  text: '問題文',
  modelAnswer: '模範回答テキスト',
};

describe('buildChoiceAnswerDetail', () => {
  test('選択した選択肢の文言と得点（100点）・isCorrect=trueを記録する', () => {
    const answer: QuestionAnswer = { questionId: 'q1', selectedChoiceNumber: 2 };

    const result = buildChoiceAnswerDetail(choiceQuestion, answer, 100);

    expect(result).toEqual({
      questionId: 'q1',
      category: 'コーディング',
      subCategory: 'if文の条件式',
      format: 'choice',
      questionText: '問題文',
      answerContent: 'B',
      score: 100,
      isCorrect: true,
      choices: [
        { text: 'A', isSelected: false, isCorrectChoice: false },
        { text: 'B', isSelected: true, isCorrectChoice: true },
        { text: 'C', isSelected: false, isCorrectChoice: false },
        { text: 'D', isSelected: false, isCorrectChoice: false },
      ],
    });
  });

  test('未回答の場合、回答内容は空文字・isCorrect=falseとする。choicesはどの肢もisSelected=falseとなる', () => {
    const answer: QuestionAnswer = { questionId: 'q1' };

    const result = buildChoiceAnswerDetail(choiceQuestion, answer, 0);

    expect(result).toMatchObject({ answerContent: '', score: 0, isCorrect: false });
    expect(result.choices?.every((choice) => !choice.isSelected)).toBe(true);
    expect(result.choices?.find((choice) => choice.isCorrectChoice)?.text).toBe('B');
  });

  test('不正解を選択した場合、選択した肢と正解の肢をそれぞれ判別できる', () => {
    const answer: QuestionAnswer = { questionId: 'q1', selectedChoiceNumber: 3 };

    const result = buildChoiceAnswerDetail(choiceQuestion, answer, 0);

    expect(result.choices).toEqual([
      { text: 'A', isSelected: false, isCorrectChoice: false },
      { text: 'B', isSelected: false, isCorrectChoice: true },
      { text: 'C', isSelected: true, isCorrectChoice: false },
      { text: 'D', isSelected: false, isCorrectChoice: false },
    ]);
  });
});

describe('buildDescriptiveAnswerDetail', () => {
  test('入力内容・得点・模範回答・フィードバックを記録する', () => {
    const answer: QuestionAnswer = { questionId: 'q2', descriptiveAnswer: '回答内容' };

    const result = buildDescriptiveAnswerDetail(textQuestion, answer, 85, '概ね正しい実装です');

    expect(result).toEqual({
      questionId: 'q2',
      category: 'SQL',
      subCategory: '集計',
      format: 'text',
      questionText: '問題文',
      answerContent: '回答内容',
      score: 85,
      modelAnswer: '模範回答テキスト',
      feedback: '概ね正しい実装です',
    });
  });
});
