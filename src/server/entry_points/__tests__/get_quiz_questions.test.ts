import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { QuizQuestion } from '../../../shared/types/quiz_question';
import * as choiceShuffler from '../../domain/services/choice_shuffler';
import * as questionSelector from '../../domain/services/question_selector';
import type { Question } from '../../domain/models/question';
import * as questionRepository from '../../repositories/question_repository';
import { getQuizQuestions } from '../get_quiz_questions';

vi.mock('../../repositories/question_repository');
vi.mock('../../domain/services/question_selector');
vi.mock('../../domain/services/choice_shuffler');

const sampleQuestion: Question = {
  id: 'cod-if-01',
  category: 'コーディング',
  subCategory: 'if文の条件式',
  format: 'choice',
  text: '問題文',
  choices: ['A', 'B', 'C', 'D'],
  correctChoiceNumber: 1,
};

const sampleQuizQuestion: QuizQuestion = {
  id: 'cod-if-01',
  format: 'choice',
  text: '問題文',
  choices: [
    { choiceNumber: 1, text: 'A' },
    { choiceNumber: 2, text: 'B' },
    { choiceNumber: 3, text: 'C' },
    { choiceNumber: 4, text: 'D' },
  ],
};

describe('getQuizQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('問題マスタの読み込み・抽出・選択肢シャッフルを順に実行し、結果を返す', () => {
    vi.mocked(questionRepository.findAllQuestions).mockReturnValue([sampleQuestion]);
    vi.mocked(questionSelector.selectExamQuestions).mockReturnValue([sampleQuestion]);
    vi.mocked(choiceShuffler.toQuizQuestion).mockReturnValue(sampleQuizQuestion);

    const result = getQuizQuestions('applicant');

    expect(questionRepository.findAllQuestions).toHaveBeenCalled();
    expect(questionSelector.selectExamQuestions).toHaveBeenCalledWith([sampleQuestion]);
    expect(choiceShuffler.toQuizQuestion).toHaveBeenCalledWith(sampleQuestion);
    expect(result).toEqual([sampleQuizQuestion]);
  });

  test('不正なroleが渡された場合はエラーを投げ、問題マスタへはアクセスしない', () => {
    expect(() => getQuizQuestions('hacker')).toThrow('不正な受験者区分');
    expect(questionRepository.findAllQuestions).not.toHaveBeenCalled();
  });

  test.each(['applicant', 'newhire', 'junior'])('roleが%sの場合は正常に呼び出せる', (role) => {
    vi.mocked(questionRepository.findAllQuestions).mockReturnValue([]);
    vi.mocked(questionSelector.selectExamQuestions).mockReturnValue([]);

    expect(() => getQuizQuestions(role)).not.toThrow();
  });
});
