// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import type { AnswerDetail } from '../../../shared/types/answer_detail';
import { renderAnswerDetailList } from '../answer_detail_view';

const choiceDetail = (overrides: Partial<AnswerDetail> = {}): AnswerDetail => ({
  questionId: 'q1',
  category: 'コーディング',
  subCategory: 'if文の条件式',
  format: 'choice',
  questionText: '正しい選択肢を選びなさい',
  answerContent: 'A',
  score: 100,
  isCorrect: true,
  choices: [
    { text: 'A', isSelected: true, isCorrectChoice: true },
    { text: 'B', isSelected: false, isCorrectChoice: false },
    { text: 'C', isSelected: false, isCorrectChoice: false },
  ],
  ...overrides,
});

const textDetail = (overrides: Partial<AnswerDetail> = {}): AnswerDetail => ({
  questionId: 'q2',
  category: 'SQL',
  subCategory: '集計',
  format: 'text',
  questionText: 'SQL文を書きなさい',
  answerContent: '回答内容',
  score: 70,
  modelAnswer: '模範回答',
  feedback: 'やや不足',
  ...overrides,
});

describe('renderAnswerDetailList', () => {
  test('回答詳細の件数分カードを、受験画面と同じ順序で描画する', () => {
    const container = document.createElement('div');

    renderAnswerDetailList(container, [choiceDetail(), textDetail()]);

    expect(container.children).toHaveLength(2);
  });

  test('各カードの先頭に、受験画面と同じ「Q1」形式の番号を出題順に表示する', () => {
    const container = document.createElement('div');

    renderAnswerDetailList(container, [choiceDetail(), textDetail()]);

    const numbers = Array.from(container.querySelectorAll('.quiz-question-number')).map((el) => el.textContent);
    expect(numbers).toEqual(['Q1', 'Q2']);
  });

  test('選択式：上部に「選択式」タグと区分タグを表示する', () => {
    const container = document.createElement('div');

    renderAnswerDetailList(container, [choiceDetail()]);

    const cardText = container.textContent ?? '';
    expect(cardText).toContain('選択式');
    expect(cardText).toContain('コーディング');
    expect(cardText).toContain('正しい選択肢を選びなさい');
  });

  test('選択式：選択した肢が正解の場合、チェック・「：正解」を表示し is-correct-selected クラスを付与する', () => {
    const container = document.createElement('div');

    renderAnswerDetailList(container, [choiceDetail()]);

    const rows = Array.from(container.querySelectorAll('.answer-choice-row'));
    const selectedRow = rows.find((row) => row.textContent?.includes('A：正解'));
    expect(selectedRow).toBeDefined();
    expect(selectedRow?.classList.contains('is-correct-selected')).toBe(true);
    expect(selectedRow?.querySelector('.answer-choice-check')?.textContent).toBe('✓');
  });

  test('選択式：選択した肢が不正解の場合、選択肢は赤・太字「：間違い」、正解の肢は緑「：こちらが正解」（チェック無し）を表示する', () => {
    const container = document.createElement('div');
    const detail = choiceDetail({
      answerContent: 'B',
      score: 0,
      isCorrect: false,
      choices: [
        { text: 'A', isSelected: false, isCorrectChoice: true },
        { text: 'B', isSelected: true, isCorrectChoice: false },
        { text: 'C', isSelected: false, isCorrectChoice: false },
      ],
    });

    renderAnswerDetailList(container, [detail]);

    const rows = Array.from(container.querySelectorAll('.answer-choice-row'));
    const wrongRow = rows.find((row) => row.textContent?.includes('B：間違い'));
    const correctRow = rows.find((row) => row.textContent?.includes('A：こちらが正解'));

    expect(wrongRow?.classList.contains('is-incorrect-selected')).toBe(true);
    expect(wrongRow?.querySelector('.answer-choice-check')?.textContent).toBe('✓');

    expect(correctRow?.classList.contains('is-correct-unselected')).toBe(true);
    expect(correctRow?.querySelector('.answer-choice-check')?.textContent).toBe('');
  });

  test('選択式：未回答の場合、どの肢にもチェック・強調は付かず、正解の肢のみ「：こちらが正解」を表示する', () => {
    const container = document.createElement('div');
    const detail = choiceDetail({
      answerContent: '',
      score: 0,
      isCorrect: false,
      choices: [
        { text: 'A', isSelected: false, isCorrectChoice: true },
        { text: 'B', isSelected: false, isCorrectChoice: false },
      ],
    });

    renderAnswerDetailList(container, [detail]);

    const rows = Array.from(container.querySelectorAll('.answer-choice-row'));
    expect(rows.some((row) => row.classList.contains('is-incorrect-selected'))).toBe(false);
    const correctRow = rows.find((row) => row.textContent?.includes('A：こちらが正解'));
    expect(correctRow?.classList.contains('is-correct-unselected')).toBe(true);
  });

  test('無関係な肢（未選択・不正解）には強調も語尾も付かない', () => {
    const container = document.createElement('div');

    renderAnswerDetailList(container, [choiceDetail()]);

    const rows = Array.from(container.querySelectorAll('.answer-choice-row'));
    const neutralRow = rows.find((row) => row.textContent?.startsWith('C'));
    expect(neutralRow?.textContent).toBe('C');
    expect(neutralRow?.className).toBe('answer-choice-row');
  });

  test('記述式：上部に「記述式」タグと区分タグ、問題文・入力回答・スコア・参考回答・フィードバックを表示する', () => {
    const container = document.createElement('div');

    renderAnswerDetailList(container, [textDetail()]);

    const cardText = container.textContent ?? '';
    expect(cardText).toContain('記述式');
    expect(cardText).toContain('SQL');
    expect(cardText).toContain('SQL文を書きなさい');
    expect(cardText).toContain('回答内容');
    expect(cardText).toContain('70点');
    expect(cardText).toContain('模範回答');
    expect(cardText).toContain('やや不足');
  });

  test('記述式：未回答の場合は「（未回答）」を表示する', () => {
    const container = document.createElement('div');

    renderAnswerDetailList(container, [textDetail({ answerContent: '' })]);

    expect(container.textContent).toContain('（未回答）');
  });

  test('描画前に既存の内容をクリアする', () => {
    const container = document.createElement('div');
    container.appendChild(document.createElement('span'));

    renderAnswerDetailList(container, [choiceDetail()]);

    expect(container.children).toHaveLength(1);
  });

  describe('問題番号の下の結果マーク', () => {
    test('選択式：正解の場合は緑の「○」を表示する', () => {
      const container = document.createElement('div');

      renderAnswerDetailList(container, [choiceDetail({ isCorrect: true })]);

      const mark = container.querySelector('.answer-result-mark');
      expect(mark?.textContent).toBe('○');
      expect(mark?.classList.contains('is-correct')).toBe(true);
      expect(container.querySelector('.answer-result-unanswered')).toBeNull();
    });

    test('選択式：不正解（回答あり）の場合は赤の「×」を表示し、「未回答」は表示しない', () => {
      const container = document.createElement('div');

      renderAnswerDetailList(container, [choiceDetail({ answerContent: 'B', isCorrect: false, score: 0 })]);

      const mark = container.querySelector('.answer-result-mark');
      expect(mark?.textContent).toBe('×');
      expect(mark?.classList.contains('is-incorrect')).toBe(true);
      expect(container.querySelector('.answer-result-unanswered')).toBeNull();
    });

    test('選択式：未回答の場合は赤の「×」の下に赤字で「未回答」を表示する', () => {
      const container = document.createElement('div');

      renderAnswerDetailList(container, [choiceDetail({ answerContent: '', isCorrect: false, score: 0 })]);

      const mark = container.querySelector('.answer-result-mark');
      expect(mark?.textContent).toBe('×');
      expect(mark?.classList.contains('is-incorrect')).toBe(true);
      expect(container.querySelector('.answer-result-unanswered')?.textContent).toBe('未回答');
    });

    test('記述式：80点以上は緑色でスコアを表示する', () => {
      const container = document.createElement('div');

      renderAnswerDetailList(container, [textDetail({ score: 80 })]);

      const mark = container.querySelector('.answer-result-mark');
      expect(mark?.textContent).toBe('80点');
      expect(mark?.classList.contains('is-correct')).toBe(true);
    });

    test('記述式：50点未満は赤色でスコアを表示する', () => {
      const container = document.createElement('div');

      renderAnswerDetailList(container, [textDetail({ score: 49 })]);

      const mark = container.querySelector('.answer-result-mark');
      expect(mark?.textContent).toBe('49点');
      expect(mark?.classList.contains('is-incorrect')).toBe(true);
    });

    test('記述式：50点以上80点未満は既定色（is-correct/is-incorrectのいずれも付かない）でスコアを表示する', () => {
      const container = document.createElement('div');

      renderAnswerDetailList(container, [textDetail({ score: 65 })]);

      const mark = container.querySelector('.answer-result-mark');
      expect(mark?.textContent).toBe('65点');
      expect(mark?.classList.contains('is-correct')).toBe(false);
      expect(mark?.classList.contains('is-incorrect')).toBe(false);
    });
  });
});
