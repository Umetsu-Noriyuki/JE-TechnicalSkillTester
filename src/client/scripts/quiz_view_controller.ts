import { isExamineeRole, type ExamineeRole } from '../../shared/types/examinee_role';
import type { QuizQuestion } from '../../shared/types/quiz_question';
import { fetchQuizQuestions } from './api_client';
import { createExamTimer, formatElapsedTime, isRemainingTimeWarning } from './timer';

export interface ExamineeInputValues {
  name: string;
  employeeNumber: string | null;
  department: string | null;
}

/**
 * 開始画面の入力チェック（6-2章）。社員番号・所属は入社希望者以外で必須。
 * エラーがなければ null を返す。
 */
export const validateExamineeInput = (values: ExamineeInputValues, role: ExamineeRole): string | null => {
  if (values.name.trim() === '') {
    return '氏名を入力してください';
  }
  if (role !== 'applicant' && (values.employeeNumber === null || values.employeeNumber.trim() === '')) {
    return '社員番号を入力してください';
  }
  if (role !== 'applicant' && (values.department === null || values.department.trim() === '')) {
    return '所属を選択してください';
  }
  return null;
};

const createEl = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: { className?: string; text?: string },
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  if (options?.className !== undefined) {
    element.className = options.className;
  }
  if (options?.text !== undefined) {
    element.textContent = options.text;
  }
  return element;
};

const buildChoiceQuestionBody = (question: QuizQuestion, onAnswer: (questionId: string) => void): HTMLElement => {
  const choicesEl = createEl('div');
  choicesEl.style.display = 'flex';
  choicesEl.style.flexDirection = 'column';
  choicesEl.style.gap = '12px';

  for (const choice of question.choices ?? []) {
    const label = createEl('label', { className: 'radio' });
    const input = createEl('input');
    input.type = 'radio';
    input.name = `question-${question.id}`;
    input.value = String(choice.choiceNumber);
    input.addEventListener('change', () => onAnswer(question.id));

    const dot = createEl('span', { className: 'dot' });
    const text = createEl('span', { text: choice.text });

    label.append(input, dot, text);
    choicesEl.appendChild(label);
  }

  return choicesEl;
};

const buildTextQuestionBody = (question: QuizQuestion, onAnswer: (questionId: string) => void): HTMLElement => {
  const textarea = createEl('textarea', { className: 'input' });
  textarea.style.minHeight = '120px';
  textarea.addEventListener('input', () => {
    if (textarea.value.trim() !== '') {
      onAnswer(question.id);
    }
  });
  return textarea;
};

/** 受験画面に全問題を描画する（5章, 9章）。区分・小区分は表示しない（7-4章）。 */
export const renderQuizQuestions = (
  container: HTMLElement,
  questions: readonly QuizQuestion[],
  onAnswer: (questionId: string) => void,
): void => {
  container.replaceChildren();

  questions.forEach((question, index) => {
    const wrapper = createEl('div', { className: 'quiz-question' });
    wrapper.dataset.questionId = question.id;

    const numberEl = createEl('div', { className: 'quiz-question-number', text: `Q${index + 1}` });

    const bodyEl = createEl('div', { className: 'quiz-question-body' });
    const tag = createEl('span', {
      className: question.format === 'choice' ? 'tag tag-neutral' : 'tag tag-accent',
      text: question.format === 'choice' ? '選択式' : '記述式',
    });
    const textEl = createEl('p', { text: question.text });
    const answerBody =
      question.format === 'choice'
        ? buildChoiceQuestionBody(question, onAnswer)
        : buildTextQuestionBody(question, onAnswer);

    bodyEl.append(tag, textEl, answerBody);
    wrapper.append(numberEl, bodyEl);
    container.appendChild(wrapper);
  });
};

interface ProgressElements {
  answeredCount: HTMLElement;
  progressBarFill: HTMLElement;
  unansweredCount: HTMLElement;
}

/** 経過状況表示（回答済み数・進捗バー・未回答数）を更新する（5章）。 */
export const updateProgress = (elements: ProgressElements, answeredCount: number, totalCount: number): void => {
  elements.answeredCount.textContent = String(answeredCount);
  const percentage = totalCount === 0 ? 0 : Math.round((answeredCount / totalCount) * 100);
  elements.progressBarFill.style.width = `${percentage}%`;
  elements.unansweredCount.textContent = `${totalCount - answeredCount}問`;
};

/** 問題一覧（サイドバーのナビグリッド）を描画する。クリックで該当問題へスクロールする。 */
export const renderNavGrid = (
  container: HTMLElement,
  questionIds: readonly string[],
  onNavigate: (questionId: string) => void,
): void => {
  container.replaceChildren();

  questionIds.forEach((questionId, index) => {
    const cell = createEl('span', { className: 'quiz-nav-cell', text: String(index + 1) });
    cell.dataset.questionId = questionId;
    cell.addEventListener('click', () => onNavigate(questionId));
    container.appendChild(cell);
  });
};

/** ナビグリッドの回答済み表示を、現在の回答済みID集合に合わせて更新する。 */
export const updateNavGridAnsweredState = (container: HTMLElement, answeredQuestionIds: ReadonlySet<string>): void => {
  for (const cell of Array.from(container.children)) {
    if (!(cell instanceof HTMLElement)) {
      continue;
    }
    const questionId = cell.dataset.questionId;
    cell.classList.toggle('is-answered', questionId !== undefined && answeredQuestionIds.has(questionId));
  }
};

/** 経過時間表示を更新する（9-2章：残り5分を切ったら警告色にする）。 */
export const updateTimerDisplay = (elements: { elapsedTime: HTMLElement }, elapsedSeconds: number): void => {
  elements.elapsedTime.textContent = formatElapsedTime(elapsedSeconds);
  elements.elapsedTime.classList.toggle('is-warning', isRemainingTimeWarning(elapsedSeconds));
};

/**
 * 制限時間到達時の画面状態にする（9-3章）：バナー表示、全設問の入力欄を操作不可にする。
 * 入力済みの内容はdisabled化しても保持される。
 */
export const showTimeoutState = (elements: { timeoutBanner: HTMLElement; questionsContainer: HTMLElement }): void => {
  elements.timeoutBanner.style.display = '';
  elements.questionsContainer.querySelectorAll('input, textarea').forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.disabled = true;
    }
  });
};

const getRequiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`要素が見つかりません: #${id}`);
  }
  return element as T;
};

interface QuizScreenElements {
  screen: HTMLElement;
  elapsedTime: HTMLElement;
  answeredCount: HTMLElement;
  progressBarFill: HTMLElement;
  unansweredCount: HTMLElement;
  questionsContainer: HTMLElement;
  navGrid: HTMLElement;
  timeoutBanner: HTMLElement;
}

const getQuizScreenElements = (): QuizScreenElements => ({
  screen: getRequiredElement('quiz-screen'),
  elapsedTime: getRequiredElement('quiz-elapsed-time'),
  answeredCount: getRequiredElement('quiz-answered-count'),
  progressBarFill: getRequiredElement('quiz-progress-bar-fill'),
  unansweredCount: getRequiredElement('quiz-unanswered-count'),
  questionsContainer: getRequiredElement('quiz-questions'),
  navGrid: getRequiredElement('quiz-nav-grid'),
  timeoutBanner: getRequiredElement('quiz-timeout-banner'),
});

const readExamineeInputValues = (): ExamineeInputValues => ({
  name: getRequiredElement<HTMLInputElement>('examinee-name').value,
  employeeNumber: (document.getElementById('examinee-number') as HTMLInputElement | null)?.value ?? null,
  department: (document.getElementById('examinee-department') as HTMLSelectElement | null)?.value ?? null,
});

/**
 * 「テスト開始」ボタン押下時の一連の処理（6-3章）：入力チェック→問題取得→
 * 受験画面への切り替え→タイマー開始。
 */
const startExam = async (): Promise<void> => {
  const role = document.body.dataset.role;
  if (!isExamineeRole(role)) {
    throw new Error(`role が不正です: ${String(role)}`);
  }

  const validationError = validateExamineeInput(readExamineeInputValues(), role);
  if (validationError !== null) {
    window.alert(validationError);
    return;
  }

  let questions: QuizQuestion[];
  try {
    questions = await fetchQuizQuestions(role);
  } catch (error) {
    window.alert('問題の取得に失敗しました。時間をおいて再度お試しください。');
    // eslint-disable-next-line no-console
    console.error('fetchQuizQuestions failed', error);
    return;
  }

  getRequiredElement('start-screen').style.display = 'none';
  const quizElements = getQuizScreenElements();
  quizElements.screen.style.display = '';

  const answeredQuestionIds = new Set<string>();
  const handleAnswer = (questionId: string): void => {
    answeredQuestionIds.add(questionId);
    updateProgress(quizElements, answeredQuestionIds.size, questions.length);
    updateNavGridAnsweredState(quizElements.navGrid, answeredQuestionIds);
  };

  renderQuizQuestions(quizElements.questionsContainer, questions, handleAnswer);
  renderNavGrid(
    quizElements.navGrid,
    questions.map((question) => question.id),
    (questionId) => {
      document.querySelector(`[data-question-id="${questionId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  );
  updateProgress(quizElements, 0, questions.length);

  const timer = createExamTimer({
    onTick: (elapsedSeconds) => updateTimerDisplay(quizElements, elapsedSeconds),
    onTimeUp: () => showTimeoutState(quizElements),
  });
  timer.start();
};

/** 開始画面の「テスト開始」ボタンにクリックハンドラを配線する。 */
export const bindStartButton = (): void => {
  const button = getRequiredElement<HTMLButtonElement>('start-test-button');
  button.addEventListener('click', () => {
    void startExam();
  });
};
