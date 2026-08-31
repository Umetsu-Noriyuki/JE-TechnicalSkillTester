import { describe, expect, test } from 'vitest';
import type { QuestionAnswer } from '../../../../shared/types/answer_payload';
import type { Question } from '../../models/question';
import { buildAnswerDetails } from '../answer_detail_builder';

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

describe('buildAnswerDetails', () => {
  test('選択式：正解を選んだ場合、選択肢の文言とisCorrect=trueを記録する', () => {
    const answers: QuestionAnswer[] = [{ questionId: 'q1', selectedChoiceNumber: 2 }];

    const result = buildAnswerDetails([choiceQuestion], answers);

    expect(result).toEqual([
      {
        questionId: 'q1',
        category: 'コーディング',
        subCategory: 'if文の条件式',
        format: 'choice',
        answerContent: 'B',
        isCorrect: true,
      },
    ]);
  });

  test('選択式：不正解を選んだ場合、isCorrect=falseを記録する', () => {
    const answers: QuestionAnswer[] = [{ questionId: 'q1', selectedChoiceNumber: 1 }];

    const result = buildAnswerDetails([choiceQuestion], answers);

    expect(result[0]).toMatchObject({ answerContent: 'A', isCorrect: false });
  });

  test('選択式：未回答の場合、回答内容は空文字・isCorrect=falseとする', () => {
    const answers: QuestionAnswer[] = [{ questionId: 'q1' }];

    const result = buildAnswerDetails([choiceQuestion], answers);

    expect(result[0]).toMatchObject({ answerContent: '', isCorrect: false });
  });

  test('記述式：入力内容と模範回答を記録し、isCorrectは含めない', () => {
    const answers: QuestionAnswer[] = [{ questionId: 'q2', descriptiveAnswer: '回答内容' }];

    const result = buildAnswerDetails([textQuestion], answers);

    expect(result).toEqual([
      {
        questionId: 'q2',
        category: 'SQL',
        subCategory: '集計',
        format: 'text',
        answerContent: '回答内容',
        modelAnswer: '模範回答テキスト',
      },
    ]);
  });

  test('問題マスタに存在しないquestionIdの回答は無視する', () => {
    const answers: QuestionAnswer[] = [{ questionId: 'unknown', selectedChoiceNumber: 1 }];

    const result = buildAnswerDetails([choiceQuestion], answers);

    expect(result).toHaveLength(0);
  });
});
