import { describe, expect, test, vi } from 'vitest';
import { getSheetValues } from '../../infrastructure/spreadsheet_client';
import { findAllQuestions } from '../question_repository';

vi.mock('../../infrastructure/spreadsheet_client', () => ({
  getSheetValues: vi.fn(),
}));

const HEADER_ROW = [
  '問題ID',
  '区分',
  '小区分',
  '出題形式',
  '問題文',
  '選択肢1',
  '選択肢2',
  '選択肢3',
  '選択肢4',
  '正解番号',
  '模範回答',
  '備考',
];

describe('findAllQuestions', () => {
  test('選択式の行を正しくQuestionへ変換する', () => {
    vi.mocked(getSheetValues).mockReturnValue([
      HEADER_ROW,
      ['cod-if-01', 'コーディング', 'if文の条件式', 'choice', '設問文', 'A', 'B', 'C', 'D', 2, '', '備考テキスト'],
    ]);

    const result = findAllQuestions();

    expect(result).toEqual([
      {
        id: 'cod-if-01',
        category: 'コーディング',
        subCategory: 'if文の条件式',
        format: 'choice',
        text: '設問文',
        choices: ['A', 'B', 'C', 'D'],
        correctChoiceNumber: 2,
        note: '備考テキスト',
      },
    ]);
  });

  test('記述式の行を正しくQuestionへ変換する', () => {
    vi.mocked(getSheetValues).mockReturnValue([
      HEADER_ROW,
      ['sql-01', 'SQL', '集計', 'text', 'SQL設問文', '', '', '', '', '', '模範回答テキスト', ''],
    ]);

    const result = findAllQuestions();

    expect(result).toEqual([
      {
        id: 'sql-01',
        category: 'SQL',
        subCategory: '集計',
        format: 'text',
        text: 'SQL設問文',
        modelAnswer: '模範回答テキスト',
      },
    ]);
  });

  test('問題IDが空の行（末尾の空白行）は無視する', () => {
    vi.mocked(getSheetValues).mockReturnValue([
      HEADER_ROW,
      ['cod-if-01', 'コーディング', 'if文の条件式', 'choice', '設問文', 'A', 'B', 'C', 'D', 1, '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', ''],
    ]);

    const result = findAllQuestions();

    expect(result).toHaveLength(1);
  });

  test('出題形式が choice / text 以外の場合はエラーを投げる', () => {
    vi.mocked(getSheetValues).mockReturnValue([
      HEADER_ROW,
      ['bad-01', '区分', '小区分', 'unknown-format', '問題文', '', '', '', '', '', '', ''],
    ]);

    expect(() => findAllQuestions()).toThrow('出題形式');
  });

  test('選択式で正解番号が範囲外の場合はエラーを投げる', () => {
    vi.mocked(getSheetValues).mockReturnValue([
      HEADER_ROW,
      ['bad-02', '区分', '小区分', 'choice', '問題文', 'A', 'B', 'C', 'D', 5, '', ''],
    ]);

    expect(() => findAllQuestions()).toThrow('正解番号');
  });

  test('選択式で選択肢が空の場合はエラーを投げる', () => {
    vi.mocked(getSheetValues).mockReturnValue([
      HEADER_ROW,
      ['bad-03', '区分', '小区分', 'choice', '問題文', 'A', '', 'C', 'D', 1, '', ''],
    ]);

    expect(() => findAllQuestions()).toThrow('選択肢2');
  });

  test('記述式で模範回答が空の場合はエラーを投げる', () => {
    vi.mocked(getSheetValues).mockReturnValue([
      HEADER_ROW,
      ['bad-04', '区分', '小区分', 'text', '問題文', '', '', '', '', '', '', ''],
    ]);

    expect(() => findAllQuestions()).toThrow('模範回答');
  });
});
