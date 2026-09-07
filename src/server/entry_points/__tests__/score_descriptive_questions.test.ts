import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { AnswerPayload } from '../../../shared/types/answer_payload';
import * as descriptiveScorer from '../../domain/services/descriptive_scorer';
import type { Question } from '../../domain/models/question';
import * as questionRepository from '../../repositories/question_repository';
import * as resultRepository from '../../repositories/result_repository';
import { scoreDescriptiveQuestions } from '../score_descriptive_questions';

vi.mock('../../repositories/question_repository');
vi.mock('../../repositories/result_repository');
vi.mock('../../domain/services/descriptive_scorer');

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

const textQuestion2: Question = {
  id: 'q3',
  category: 'コーディング',
  subCategory: 'ロジック',
  format: 'text',
  text: '記述式の問題文2',
  modelAnswer: '模範回答2',
};

const buildPayload = (overrides: Partial<AnswerPayload> = {}): AnswerPayload => ({
  examinee: { role: 'newhire', name: '山田太郎', employeeNumber: 'A1', department: '開発部' },
  answers: [
    { questionId: 'q1', selectedChoiceNumber: 1 },
    { questionId: 'q2', descriptiveAnswer: '回答内容' },
  ],
  elapsedSeconds: 1000,
  isTimedOut: false,
  ...overrides,
});

describe('scoreDescriptiveQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(questionRepository.findAllQuestions).mockReturnValue([choiceQuestion, textQuestion, textQuestion2]);
    vi.mocked(descriptiveScorer.scoreDescriptiveAnswersBatch).mockReturnValue([
      { questionId: 'q2', score: 70, feedback: 'やや不足があります' },
    ]);
  });

  test('記述式問題をまとめて1回だけscoreDescriptiveAnswersBatchへ渡す', () => {
    scoreDescriptiveQuestions(5, buildPayload());

    expect(descriptiveScorer.scoreDescriptiveAnswersBatch).toHaveBeenCalledWith([
      { questionId: 'q2', question: '記述式の問題文', sampleAnswer: '模範回答', studentAnswer: '回答内容' },
    ]);
  });

  test('選択式・記述式を合わせた最終的な採点結果でシートを更新する', () => {
    scoreDescriptiveQuestions(5, buildPayload());

    expect(resultRepository.updateExamResultAfterDescriptiveScoring).toHaveBeenCalledWith(5, {
      overallCorrectRate: 85,
      categoryScores: expect.arrayContaining([
        expect.objectContaining({ categoryName: 'コーディング', totalScore: 100 }),
        expect.objectContaining({ categoryName: 'SQL', totalScore: 70 }),
      ]),
      answerDetailsJson: expect.any(String),
      descriptiveScoreCells: [
        { questionId: 'q2', studentAnswer: '回答内容', score: 70, referenceAnswer: '模範回答', feedback: 'やや不足があります' },
      ],
    });
  });

  test('回答詳細（M列相当）には選択式・記述式それぞれの最終的な得点が含まれる', () => {
    scoreDescriptiveQuestions(5, buildPayload());

    const update = vi.mocked(resultRepository.updateExamResultAfterDescriptiveScoring).mock.calls[0]?.[1];
    const details = JSON.parse(update?.answerDetailsJson ?? '[]');

    expect(details).toEqual([
      {
        questionId: 'q1',
        category: 'コーディング',
        subCategory: 'if文の条件式',
        format: 'choice',
        answerContent: 'A',
        score: 100,
        isCorrect: true,
      },
      {
        questionId: 'q2',
        category: 'SQL',
        subCategory: '集計',
        format: 'text',
        answerContent: '回答内容',
        score: 70,
        modelAnswer: '模範回答',
        feedback: 'やや不足があります',
      },
    ]);
  });

  test('複数の記述式問題がある場合、まとめて1回だけscoreDescriptiveAnswersBatchへ渡す', () => {
    vi.mocked(descriptiveScorer.scoreDescriptiveAnswersBatch).mockReturnValue([
      { questionId: 'q2', score: 70, feedback: '1問目のフィードバック' },
      { questionId: 'q3', score: 40, feedback: '2問目のフィードバック' },
    ]);

    scoreDescriptiveQuestions(
      5,
      buildPayload({
        answers: [
          { questionId: 'q1', selectedChoiceNumber: 1 },
          { questionId: 'q2', descriptiveAnswer: '回答1' },
          { questionId: 'q3', descriptiveAnswer: '回答2' },
        ],
      }),
    );

    expect(descriptiveScorer.scoreDescriptiveAnswersBatch).toHaveBeenCalledTimes(1);
    const update = vi.mocked(resultRepository.updateExamResultAfterDescriptiveScoring).mock.calls[0]?.[1];
    expect(update?.overallCorrectRate).toBe(70); // (100+70+40)/3
    expect(update?.descriptiveScoreCells).toHaveLength(2);
  });

  test('記述式問題が0問の場合はscoreDescriptiveAnswersBatchを空配列で呼び出し、記述式採点列は空で更新する', () => {
    scoreDescriptiveQuestions(5, buildPayload({ answers: [{ questionId: 'q1', selectedChoiceNumber: 1 }] }));

    expect(descriptiveScorer.scoreDescriptiveAnswersBatch).toHaveBeenCalledWith([]);
    const update = vi.mocked(resultRepository.updateExamResultAfterDescriptiveScoring).mock.calls[0]?.[1];
    expect(update?.descriptiveScoreCells).toEqual([]);
  });
});
