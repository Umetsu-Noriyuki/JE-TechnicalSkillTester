import type { AnswerPayload, QuestionAnswer } from '../../shared/types/answer_payload';
import { isExamineeRole, type ExamineeRole } from '../../shared/types/examinee_role';
import type { QuizQuestion } from '../../shared/types/quiz_question';
import type { CategoryScore, ScoringResult } from '../../shared/types/scoring_result';
import { fetchQuizQuestions, submitExamResult } from './api_client';
import { createExamTimer, formatDurationJapanese, formatElapsedTime, isRemainingTimeWarning } from './timer';

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

/**
 * 受験画面のDOMから、各設問の現在の回答内容を収集する（10-1章：submitResultへ送信するデータ）。
 * 未回答の設問も questionId のみのエントリとして含める（出題数を正しく伝えるため）。
 */
export const collectAnswers = (questionsContainer: HTMLElement): QuestionAnswer[] => {
  const answers: QuestionAnswer[] = [];

  for (const questionEl of Array.from(questionsContainer.querySelectorAll('.quiz-question'))) {
    if (!(questionEl instanceof HTMLElement)) {
      continue;
    }
    const questionId = questionEl.dataset.questionId;
    if (questionId === undefined) {
      continue;
    }

    const checkedRadio = questionEl.querySelector('input[type="radio"]:checked');
    if (checkedRadio instanceof HTMLInputElement) {
      answers.push({ questionId, selectedChoiceNumber: Number(checkedRadio.value) });
      continue;
    }

    const textarea = questionEl.querySelector('textarea');
    if (textarea instanceof HTMLTextAreaElement) {
      answers.push({ questionId, descriptiveAnswer: textarea.value });
      continue;
    }

    answers.push({ questionId });
  }

  return answers;
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

/**
 * 問題一覧（サイドバーのナビグリッド）を描画する。クリック・キーボード操作（Enter/Space）で
 * 該当問題へスクロールする（12章：ボタン等はキーボード操作でも押下できること）。
 */
export const renderNavGrid = (
  container: HTMLElement,
  questionIds: readonly string[],
  onNavigate: (questionId: string) => void,
): void => {
  container.replaceChildren();

  questionIds.forEach((questionId, index) => {
    const cell = createEl('button', { className: 'quiz-nav-cell', text: String(index + 1) });
    cell.type = 'button';
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

interface QuizControlElements {
  questionsContainer: HTMLElement;
  navGrid: HTMLElement;
  jumpUnansweredButton: HTMLButtonElement;
}

/**
 * 全設問の入力欄・問題間の移動操作を無効化する（9-3章：「採点」／「回答終了」ボタン
 * 以外はクリックできない状態にする）。入力済みの内容はdisabled化しても保持される。
 */
const disableQuizControls = (elements: QuizControlElements): void => {
  elements.questionsContainer.querySelectorAll('input, textarea').forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.disabled = true;
    }
  });
  elements.navGrid.querySelectorAll('button').forEach((el) => {
    if (el instanceof HTMLButtonElement) {
      el.disabled = true;
    }
  });
  elements.jumpUnansweredButton.disabled = true;
};

/**
 * 制限時間到達時の画面状態にする（9-3章）：バナー表示、全設問の入力欄・移動操作を無効化する。
 */
export const showTimeoutState = (elements: { timeoutBanner: HTMLElement } & QuizControlElements): void => {
  elements.timeoutBanner.style.display = '';
  disableQuizControls(elements);
};

/**
 * 問題一覧のうち、最初に見つかった未回答の設問へスクロールする。
 * 未回答の設問がない場合はその旨を通知する。
 */
export const jumpToFirstUnanswered = (
  questionsContainer: HTMLElement,
  answeredQuestionIds: ReadonlySet<string>,
): void => {
  const target = Array.from(questionsContainer.querySelectorAll('.quiz-question')).find(
    (el): el is HTMLElement => el instanceof HTMLElement && !answeredQuestionIds.has(el.dataset.questionId ?? ''),
  );
  if (target === undefined) {
    window.alert('未回答の問題はありません。');
    return;
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const SUBMIT_BUTTON_LABEL: Record<ExamineeRole, string> = {
  applicant: '回答終了',
  newhire: '採点',
  junior: '採点',
};

/** 「採点」／「回答終了」ボタンと案内文言を、受験者区分に応じた表示に切り替える（4-2章）。 */
export const updateSubmitButtonLabel = (
  elements: { submitButton: HTMLButtonElement; submitLabel: HTMLElement },
  role: ExamineeRole,
): void => {
  const label = SUBMIT_BUTTON_LABEL[role];
  elements.submitButton.textContent = label;
  elements.submitLabel.textContent = `「${label}」`;
};

/** 総合正解率の見出し数字（CMYK風の版ズレ演出）を更新する。paper + 3枚のplate全てへ反映する。 */
export const populateScoreCmyk = (container: HTMLElement, score: number): void => {
  for (const child of Array.from(container.children)) {
    child.textContent = String(score);
  }
};

/** 分野別正解率テーブル（結果画面）を描画する（10-4章）。 */
export const renderCategoryScoreTable = (tableBody: HTMLElement, categoryScores: readonly CategoryScore[]): void => {
  tableBody.replaceChildren();

  for (const score of categoryScores) {
    const row = createEl('tr');
    row.append(
      createEl('td', { text: score.categoryName }),
      createEl('td', { text: `${score.choiceCorrectCount} / ${score.choiceQuestionCount}` }),
      createEl('td', { text: `${score.correctRate}%` }),
      createEl('td', { text: String(score.descriptiveSubmittedCount) }),
    );
    tableBody.appendChild(row);
  }
};

/** 日時を「2026/04/10 14:32」形式で整形する。 */
export const formatRecordedAt = (date: Date): string => {
  const pad2 = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
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
  submitButton: HTMLButtonElement;
  submitLabel: HTMLElement;
  jumpUnansweredButton: HTMLButtonElement;
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
  submitButton: getRequiredElement<HTMLButtonElement>('quiz-submit-button'),
  submitLabel: getRequiredElement('quiz-submit-label'),
  jumpUnansweredButton: getRequiredElement<HTMLButtonElement>('quiz-jump-unanswered-button'),
});

interface ResultScreenElements {
  screen: HTMLElement;
  examineeName: HTMLElement;
  examineeDetail: HTMLElement;
  duration: HTMLElement;
  recordedAt: HTMLElement;
  scoreCmyk: HTMLElement;
  choiceSummary: HTMLElement;
  categoryTableBody: HTMLElement;
}

const getResultScreenElements = (): ResultScreenElements => ({
  screen: getRequiredElement('result-screen'),
  examineeName: getRequiredElement('result-examinee-name'),
  examineeDetail: getRequiredElement('result-examinee-detail'),
  duration: getRequiredElement('result-duration'),
  recordedAt: getRequiredElement('result-recorded-at'),
  scoreCmyk: getRequiredElement('result-score-cmyk'),
  choiceSummary: getRequiredElement('result-choice-summary'),
  categoryTableBody: getRequiredElement('result-category-table-body'),
});

interface FinishScreenElements {
  screen: HTMLElement;
  examineeName: HTMLElement;
  duration: HTMLElement;
  recordedAt: HTMLElement;
}

const getFinishScreenElements = (): FinishScreenElements => ({
  screen: getRequiredElement('finish-screen'),
  examineeName: getRequiredElement('finish-examinee-name'),
  duration: getRequiredElement('finish-duration'),
  recordedAt: getRequiredElement('finish-recorded-at'),
});

const readExamineeInputValues = (): ExamineeInputValues => ({
  name: getRequiredElement<HTMLInputElement>('examinee-name').value,
  employeeNumber: (document.getElementById('examinee-number') as HTMLInputElement | null)?.value ?? null,
  department: (document.getElementById('examinee-department') as HTMLSelectElement | null)?.value ?? null,
});

/**
 * 「採点」／「回答終了」ボタン押下時の処理（9-4章, 10章, 11章）：submitResultへ送信→
 * 受験者区分に応じて結果画面／終了画面へ切り替えて表示する。
 * 送信に失敗した場合は false を返す（呼び出し側で再試行できるよう画面状態は変更しない）。
 */
const finishExam = async (
  role: ExamineeRole,
  examineeValues: ExamineeInputValues,
  quizElements: QuizScreenElements,
  elapsedSeconds: number,
  isTimedOut: boolean,
): Promise<boolean> => {
  const payload: AnswerPayload = {
    examinee: {
      role,
      name: examineeValues.name,
      employeeNumber: examineeValues.employeeNumber ?? undefined,
      department: examineeValues.department ?? undefined,
    },
    answers: collectAnswers(quizElements.questionsContainer),
    elapsedSeconds,
    isTimedOut,
  };

  let scoringResult: ScoringResult;
  try {
    scoringResult = await submitExamResult(payload);
  } catch (error) {
    window.alert('採点結果の送信に失敗しました。時間をおいて再度お試しください。');
    // eslint-disable-next-line no-console
    console.error('submitResult failed', error);
    return false;
  }

  quizElements.screen.style.display = 'none';
  const recordedAt = formatRecordedAt(new Date());
  const durationText = `${formatDurationJapanese(elapsedSeconds)}（${isTimedOut ? '時間切れ' : '時間内に終了'}）`;

  if (role === 'applicant') {
    const finishElements = getFinishScreenElements();
    finishElements.examineeName.textContent = examineeValues.name;
    finishElements.duration.textContent = durationText;
    finishElements.recordedAt.textContent = recordedAt;
    finishElements.screen.style.display = '';
    return true;
  }

  const resultElements = getResultScreenElements();
  resultElements.examineeName.textContent = examineeValues.name;
  resultElements.examineeDetail.textContent = `${examineeValues.employeeNumber ?? ''} ／ ${examineeValues.department ?? ''}`;
  resultElements.duration.textContent = durationText;
  resultElements.recordedAt.textContent = recordedAt;
  populateScoreCmyk(resultElements.scoreCmyk, scoringResult.overallCorrectRate);
  resultElements.choiceSummary.textContent = `選択式${scoringResult.choiceQuestionCount}問中 ${scoringResult.choiceCorrectCount}問 正解`;
  renderCategoryScoreTable(resultElements.categoryTableBody, scoringResult.categoryScores);
  resultElements.screen.style.display = '';
  return true;
};

/**
 * 「テスト開始」ボタン押下時の一連の処理（6-3章）：入力チェック→問題取得→
 * 受験画面への切り替え→タイマー開始→「採点」ボタンの配線。
 */
const startExam = async (): Promise<void> => {
  const role = document.body.dataset.role;
  if (!isExamineeRole(role)) {
    throw new Error(`role が不正です: ${String(role)}`);
  }

  const examineeValues = readExamineeInputValues();
  const validationError = validateExamineeInput(examineeValues, role);
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
  updateSubmitButtonLabel(quizElements, role);

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

  quizElements.jumpUnansweredButton.addEventListener('click', () => {
    jumpToFirstUnanswered(quizElements.questionsContainer, answeredQuestionIds);
  });

  // 可用性（12章）：タイマー動作中の再読み込みは回答内容を保持しないため、離脱前に警告する。
  const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
    event.preventDefault();
  };
  window.addEventListener('beforeunload', warnBeforeUnload);

  let elapsedSeconds = 0;
  let isTimedOut = false;

  const timer = createExamTimer({
    onTick: (seconds) => {
      elapsedSeconds = seconds;
      updateTimerDisplay(quizElements, seconds);
    },
    onTimeUp: () => {
      isTimedOut = true;
      showTimeoutState(quizElements);
    },
  });
  timer.start();

  // 送信に失敗した場合は操作を復元し、再試行できるようにする（黙って失敗させない）。
  const attemptSubmit = async (): Promise<void> => {
    quizElements.submitButton.disabled = true;
    const succeeded = await finishExam(role, examineeValues, quizElements, elapsedSeconds, isTimedOut);
    if (succeeded) {
      timer.stop();
      disableQuizControls(quizElements);
      window.removeEventListener('beforeunload', warnBeforeUnload);
      return;
    }
    quizElements.submitButton.disabled = false;
  };

  quizElements.submitButton.addEventListener('click', () => {
    void attemptSubmit();
  });
};

/** 開始画面の「テスト開始」ボタンにクリックハンドラを配線する。 */
export const bindStartButton = (): void => {
  const button = getRequiredElement<HTMLButtonElement>('start-test-button');
  button.addEventListener('click', () => {
    void startExam();
  });
};
