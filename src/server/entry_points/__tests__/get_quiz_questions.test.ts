import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { QuizQuestion } from '../../../shared/types/quiz_question';
import * as choiceShuffler from '../../domain/services/choice_shuffler';
import * as permissionChecker from '../../domain/services/examinee_permission_checker';
import * as questionSelector from '../../domain/services/question_selector';
import type { Question } from '../../domain/models/question';
import * as permissionRepository from '../../repositories/permission_repository';
import * as questionRepository from '../../repositories/question_repository';
import { getQuizQuestions } from '../get_quiz_questions';

vi.mock('../../repositories/question_repository');
vi.mock('../../repositories/permission_repository');
vi.mock('../../domain/services/question_selector');
vi.mock('../../domain/services/choice_shuffler');
vi.mock('../../domain/services/examinee_permission_checker');

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
    vi.mocked(permissionRepository.findAllowedExamineeNames).mockReturnValue(['山田太郎']);
    vi.mocked(permissionChecker.isNameAllowed).mockReturnValue(true);
    vi.mocked(questionRepository.findAllQuestions).mockReturnValue([sampleQuestion]);
    vi.mocked(questionSelector.selectExamQuestions).mockReturnValue([sampleQuestion]);
    vi.mocked(choiceShuffler.toQuizQuestion).mockReturnValue(sampleQuizQuestion);
  });

  test('問題マスタの読み込み・抽出・選択肢シャッフルを順に実行し、結果を返す', () => {
    const result = getQuizQuestions('newhire', '山田太郎');

    expect(questionRepository.findAllQuestions).toHaveBeenCalled();
    expect(questionSelector.selectExamQuestions).toHaveBeenCalledWith([sampleQuestion]);
    expect(choiceShuffler.toQuizQuestion).toHaveBeenCalledWith(sampleQuestion);
    expect(result).toEqual([sampleQuizQuestion]);
  });

  test('不正なroleが渡された場合はエラーを投げ、問題マスタへはアクセスしない', () => {
    expect(() => getQuizQuestions('hacker', '山田太郎')).toThrow('不正な受験者区分');
    expect(questionRepository.findAllQuestions).not.toHaveBeenCalled();
  });

  test.each(['newhire', 'junior'])('roleが%sの場合は受験許可チェックを行わずに呼び出せる', (role) => {
    const result = getQuizQuestions(role, '未登録の名前');

    expect(permissionRepository.findAllowedExamineeNames).not.toHaveBeenCalled();
    expect(result).toEqual([sampleQuizQuestion]);
  });

  test('roleが入社希望者で氏名が許可されている場合は問題を返す', () => {
    vi.mocked(permissionChecker.isNameAllowed).mockReturnValue(true);

    const result = getQuizQuestions('applicant', '山田太郎');

    expect(permissionRepository.findAllowedExamineeNames).toHaveBeenCalled();
    expect(permissionChecker.isNameAllowed).toHaveBeenCalledWith('山田太郎', ['山田太郎']);
    expect(result).toEqual([sampleQuizQuestion]);
  });

  test('roleが入社希望者で氏名が許可されていない場合はPERMISSION_DENIEDエラーを投げ、問題マスタへはアクセスしない', () => {
    vi.mocked(permissionChecker.isNameAllowed).mockReturnValue(false);

    expect(() => getQuizQuestions('applicant', '未登録の名前')).toThrow('PERMISSION_DENIED');
    expect(questionRepository.findAllQuestions).not.toHaveBeenCalled();
  });
});
