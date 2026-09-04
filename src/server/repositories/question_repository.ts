import { SHEET_NAMES } from '../config/constants';
import type { Question, QuestionFormat } from '../domain/models/question';
import { getSheetValues } from '../infrastructure/spreadsheet_client';

const HEADER_ROW_COUNT = 1;

const toRequiredString = (value: unknown, columnLabel: string, rowNumber: number): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`問題マスタ ${rowNumber}行目: ${columnLabel} が空です`);
  }
  return value;
};

const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
};

const toQuestionFormat = (value: unknown, rowNumber: number): QuestionFormat => {
  if (value === 'choice' || value === 'text') {
    return value;
  }
  throw new Error(`問題マスタ ${rowNumber}行目: 出題形式は choice または text である必要があります`);
};

const toCorrectChoiceNumber = (value: unknown, rowNumber: number): number => {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 4) {
    throw new Error(`問題マスタ ${rowNumber}行目: 正解番号は1〜4の整数である必要があります`);
  }
  return num;
};

const CHOICE_COLUMN_INDEXES = [5, 6, 7, 8] as const;

const parseQuestionRow = (row: readonly unknown[], rowNumber: number): Question => {
  const id = toRequiredString(row[0], '問題ID', rowNumber);
  const category = toRequiredString(row[1], '区分', rowNumber);
  const subCategory = toRequiredString(row[2], '小区分', rowNumber);
  const format = toQuestionFormat(row[3], rowNumber);
  const text = toRequiredString(row[4], '問題文', rowNumber);
  const note = toOptionalString(row[11]);

  if (format === 'choice') {
    const choices = CHOICE_COLUMN_INDEXES.map((columnIndex, choiceIndex) =>
      toRequiredString(row[columnIndex], `選択肢${choiceIndex + 1}`, rowNumber),
    );
    const correctChoiceNumber = toCorrectChoiceNumber(row[9], rowNumber);
    return { id, category, subCategory, format, text, choices, correctChoiceNumber, note };
  }

  const modelAnswer = toRequiredString(row[10], '模範回答', rowNumber);
  return { id, category, subCategory, format, text, modelAnswer, note };
};

/**
 * 「問題マスタ」シートの全問題を読み込む（7-1章）。
 * 問題IDが空の行は、末尾の空白行とみなして無視する。
 */
export const findAllQuestions = (): Question[] => {
  const rows = getSheetValues(SHEET_NAMES.questionMaster);
  return rows
    .map((row, index) => ({ row, rowNumber: index + 1 }))
    .slice(HEADER_ROW_COUNT)
    .filter(({ row }) => typeof row[0] === 'string' && row[0].trim() !== '')
    .map(({ row, rowNumber }) => parseQuestionRow(row, rowNumber));
};
