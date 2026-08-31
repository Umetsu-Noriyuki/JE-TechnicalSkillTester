// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { CategoryScore } from '../../../shared/types/scoring_result';
import type { QuizQuestion } from '../../../shared/types/quiz_question';
import {
  collectAnswers,
  formatRecordedAt,
  populateScoreCmyk,
  renderCategoryScoreTable,
  renderNavGrid,
  renderQuizQuestions,
  showTimeoutState,
  updateNavGridAnsweredState,
  updateProgress,
  updateSubmitButtonLabel,
  updateTimerDisplay,
  validateExamineeInput,
} from '../quiz_view_controller';

describe('validateExamineeInput', () => {
  test('氏名が空の場合はエラーを返す', () => {
    const result = validateExamineeInput({ name: '', employeeNumber: null, department: null }, 'applicant');
    expect(result).toBe('氏名を入力してください');
  });

  test('入社希望者は氏名のみで検証を通過する', () => {
    const result = validateExamineeInput({ name: '山田太郎', employeeNumber: null, department: null }, 'applicant');
    expect(result).toBeNull();
  });

  test('社員区分で社員番号が空の場合はエラーを返す', () => {
    const result = validateExamineeInput(
      { name: '山田太郎', employeeNumber: '', department: '開発部' },
      'newhire',
    );
    expect(result).toBe('社員番号を入力してください');
  });

  test('社員区分で所属が空の場合はエラーを返す', () => {
    const result = validateExamineeInput(
      { name: '山田太郎', employeeNumber: 'A123456', department: '' },
      'junior',
    );
    expect(result).toBe('所属を選択してください');
  });

  test('社員区分で全項目入力済みの場合は検証を通過する', () => {
    const result = validateExamineeInput(
      { name: '山田太郎', employeeNumber: 'A123456', department: '開発部' },
      'newhire',
    );
    expect(result).toBeNull();
  });
});

const choiceQuestion: QuizQuestion = {
  id: 'q-choice',
  format: 'choice',
  text: '選択式の問題文',
  choices: [
    { choiceNumber: 1, text: 'A' },
    { choiceNumber: 2, text: 'B' },
  ],
};

const textQuestion: QuizQuestion = {
  id: 'q-text',
  format: 'text',
  text: '記述式の問題文',
};

describe('renderQuizQuestions', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('選択式・記述式それぞれの問題を描画する', () => {
    renderQuizQuestions(container, [choiceQuestion, textQuestion], vi.fn());

    const questionEls = container.querySelectorAll('.quiz-question');
    expect(questionEls).toHaveLength(2);
    expect(questionEls[0]?.querySelector('.quiz-question-number')?.textContent).toBe('Q1');
    expect(questionEls[0]?.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    expect(questionEls[1]?.querySelector('textarea')).not.toBeNull();
  });

  test('選択肢を選ぶとonAnswerがquestionIdとともに呼ばれる', () => {
    const onAnswer = vi.fn();
    renderQuizQuestions(container, [choiceQuestion], onAnswer);

    const radio = container.querySelector('input[type="radio"]');
    expect(radio).not.toBeNull();
    radio?.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onAnswer).toHaveBeenCalledWith('q-choice');
  });

  test('記述式に文字を入力するとonAnswerが呼ばれ、空欄に戻しても呼ばれない', () => {
    const onAnswer = vi.fn();
    renderQuizQuestions(container, [textQuestion], onAnswer);

    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();
    if (textarea === null) throw new Error('textarea not found');

    textarea.value = '回答内容';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onAnswer).toHaveBeenCalledTimes(1);

    onAnswer.mockClear();
    textarea.value = '';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onAnswer).not.toHaveBeenCalled();
  });

  test('再描画時に前回の内容をクリアする', () => {
    renderQuizQuestions(container, [choiceQuestion], vi.fn());
    renderQuizQuestions(container, [textQuestion], vi.fn());

    expect(container.querySelectorAll('.quiz-question')).toHaveLength(1);
  });
});

describe('updateProgress', () => {
  test('回答済み数・進捗バー幅・未回答数を更新する', () => {
    const elements = {
      answeredCount: document.createElement('span'),
      progressBarFill: document.createElement('div'),
      unansweredCount: document.createElement('span'),
    };

    updateProgress(elements, 6, 30);

    expect(elements.answeredCount.textContent).toBe('6');
    expect(elements.progressBarFill.style.width).toBe('20%');
    expect(elements.unansweredCount.textContent).toBe('24問');
  });

  test('総数が0の場合でもゼロ除算にならない', () => {
    const elements = {
      answeredCount: document.createElement('span'),
      progressBarFill: document.createElement('div'),
      unansweredCount: document.createElement('span'),
    };

    updateProgress(elements, 0, 0);

    expect(elements.progressBarFill.style.width).toBe('0%');
  });
});

describe('renderNavGrid / updateNavGridAnsweredState', () => {
  test('問題数分のセルを描画し、クリックでonNavigateが呼ばれる', () => {
    const container = document.createElement('div');
    const onNavigate = vi.fn();

    renderNavGrid(container, ['q1', 'q2', 'q3'], onNavigate);

    const cells = container.querySelectorAll('.quiz-nav-cell');
    expect(cells).toHaveLength(3);
    expect(cells[1]?.textContent).toBe('2');

    cells[1]?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(onNavigate).toHaveBeenCalledWith('q2');
  });

  test('回答済みIDに応じてis-answeredクラスが付け外しされる', () => {
    const container = document.createElement('div');
    renderNavGrid(container, ['q1', 'q2'], vi.fn());

    updateNavGridAnsweredState(container, new Set(['q1']));

    const cells = container.querySelectorAll('.quiz-nav-cell');
    expect(cells[0]?.classList.contains('is-answered')).toBe(true);
    expect(cells[1]?.classList.contains('is-answered')).toBe(false);
  });
});

describe('updateTimerDisplay', () => {
  test('経過時間をmm:ss形式で表示する', () => {
    const elapsedTime = document.createElement('span');

    updateTimerDisplay({ elapsedTime }, 754);

    expect(elapsedTime.textContent).toBe('12:34');
    expect(elapsedTime.classList.contains('is-warning')).toBe(false);
  });

  test('残り5分以下になると警告クラスが付く', () => {
    const elapsedTime = document.createElement('span');

    updateTimerDisplay({ elapsedTime }, 1500);

    expect(elapsedTime.classList.contains('is-warning')).toBe(true);
  });
});

describe('showTimeoutState', () => {
  test('バナーを表示し、設問内の入力欄を全て操作不可にする', () => {
    const timeoutBanner = document.createElement('div');
    timeoutBanner.style.display = 'none';

    const questionsContainer = document.createElement('div');
    questionsContainer.innerHTML = '<input type="radio" /><textarea></textarea>';

    showTimeoutState({ timeoutBanner, questionsContainer });

    expect(timeoutBanner.style.display).toBe('');
    expect(questionsContainer.querySelector('input')?.hasAttribute('disabled')).toBe(true);
    expect(questionsContainer.querySelector('textarea')?.hasAttribute('disabled')).toBe(true);
  });
});

describe('collectAnswers', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('選択式で選択済みの場合、選択した選択肢番号を収集する', () => {
    renderQuizQuestions(container, [choiceQuestion], vi.fn());
    const radios = container.querySelectorAll('input[type="radio"]');
    (radios[1] as HTMLInputElement).checked = true;

    const answers = collectAnswers(container);

    expect(answers).toEqual([{ questionId: 'q-choice', selectedChoiceNumber: 2 }]);
  });

  test('選択式で未回答の場合、questionIdのみのエントリになる', () => {
    renderQuizQuestions(container, [choiceQuestion], vi.fn());

    const answers = collectAnswers(container);

    expect(answers).toEqual([{ questionId: 'q-choice' }]);
  });

  test('記述式は入力内容をdescriptiveAnswerとして収集する（空でも収集する）', () => {
    renderQuizQuestions(container, [textQuestion], vi.fn());
    const textarea = container.querySelector('textarea');
    if (textarea === null) throw new Error('textarea not found');
    textarea.value = '回答内容';

    const answers = collectAnswers(container);

    expect(answers).toEqual([{ questionId: 'q-text', descriptiveAnswer: '回答内容' }]);
  });
});

describe('populateScoreCmyk', () => {
  test('paper・plate全ての子要素へ同じスコアを反映する', () => {
    const container = document.createElement('div');
    container.innerHTML = '<span class="paper">0</span><span class="plate">0</span><span class="plate">0</span>';

    populateScoreCmyk(container, 72);

    expect(Array.from(container.children).map((el) => el.textContent)).toEqual(['72', '72', '72']);
  });
});

describe('renderCategoryScoreTable', () => {
  test('区分ごとの正解率行を描画する', () => {
    const tableBody = document.createElement('tbody');
    const categoryScores: CategoryScore[] = [
      { categoryName: 'コーディング', choiceQuestionCount: 4, choiceCorrectCount: 3, correctRate: 75, descriptiveSubmittedCount: 2 },
    ];

    renderCategoryScoreTable(tableBody, categoryScores);

    const cells = tableBody.querySelectorAll('td');
    expect(cells[0]?.textContent).toBe('コーディング');
    expect(cells[1]?.textContent).toBe('3 / 4');
    expect(cells[2]?.textContent).toBe('75%');
    expect(cells[3]?.textContent).toBe('2');
  });
});

describe('updateSubmitButtonLabel', () => {
  test('入社希望者の場合は「回答終了」と表示する', () => {
    const submitButton = document.createElement('button');
    const submitLabel = document.createElement('span');

    updateSubmitButtonLabel({ submitButton, submitLabel }, 'applicant');

    expect(submitButton.textContent).toBe('回答終了');
    expect(submitLabel.textContent).toBe('「回答終了」');
  });

  test('社員区分の場合は「採点」と表示する', () => {
    const submitButton = document.createElement('button');
    const submitLabel = document.createElement('span');

    updateSubmitButtonLabel({ submitButton, submitLabel }, 'newhire');

    expect(submitButton.textContent).toBe('採点');
  });
});

describe('formatRecordedAt', () => {
  test('日時を yyyy/mm/dd hh:mm 形式で整形する', () => {
    const date = new Date(2026, 3, 10, 14, 32);

    expect(formatRecordedAt(date)).toBe('2026/04/10 14:32');
  });
});
