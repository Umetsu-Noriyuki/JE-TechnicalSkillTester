import type { ExamResultDetail } from '../../shared/types/exam_result_detail';
import type { ExamResultSearchFilter, ExamResultSummary } from '../../shared/types/exam_result_search';
import { fetchExamResultDetail, searchExamResults, verifyViewerAccessKey } from './api_client';
import { createEl, formatRecordedAt, getRequiredElement, populateScoreCmyk, renderCategoryScoreTable } from './quiz_view_controller';

interface ViewerSearchElements {
  recordedAtFrom: HTMLInputElement;
  recordedAtTo: HTMLInputElement;
  role: HTMLSelectElement;
  name: HTMLInputElement;
  employeeNumber: HTMLInputElement;
  department: HTMLInputElement;
  searchButton: HTMLButtonElement;
  emptyMessage: HTMLElement;
  resultTable: HTMLElement;
  resultTableBody: HTMLElement;
}

interface ViewerDetailElements {
  section: HTMLElement;
  roleTag: HTMLElement;
  name: HTMLElement;
  employee: HTMLElement;
  duration: HTMLElement;
  recordedAt: HTMLElement;
  scoreCmyk: HTMLElement;
  choiceSummary: HTMLElement;
  categoryTableBody: HTMLElement;
  descriptiveItems: HTMLElement;
}

const getViewerSearchElements = (): ViewerSearchElements => ({
  recordedAtFrom: getRequiredElement<HTMLInputElement>('viewer-search-recorded-at-from'),
  recordedAtTo: getRequiredElement<HTMLInputElement>('viewer-search-recorded-at-to'),
  role: getRequiredElement<HTMLSelectElement>('viewer-search-role'),
  name: getRequiredElement<HTMLInputElement>('viewer-search-name'),
  employeeNumber: getRequiredElement<HTMLInputElement>('viewer-search-employee-number'),
  department: getRequiredElement<HTMLInputElement>('viewer-search-department'),
  searchButton: getRequiredElement<HTMLButtonElement>('viewer-search-button'),
  emptyMessage: getRequiredElement('viewer-search-empty-message'),
  resultTable: getRequiredElement('viewer-search-result-table'),
  resultTableBody: getRequiredElement('viewer-search-result-table-body'),
});

const getViewerDetailElements = (): ViewerDetailElements => ({
  section: getRequiredElement('viewer-detail-section'),
  roleTag: getRequiredElement('viewer-detail-role-tag'),
  name: getRequiredElement('viewer-detail-name'),
  employee: getRequiredElement('viewer-detail-employee'),
  duration: getRequiredElement('viewer-detail-duration'),
  recordedAt: getRequiredElement('viewer-detail-recorded-at'),
  scoreCmyk: getRequiredElement('viewer-detail-score-cmyk'),
  choiceSummary: getRequiredElement('viewer-detail-choice-summary'),
  categoryTableBody: getRequiredElement('viewer-detail-category-table-body'),
  descriptiveItems: getRequiredElement('viewer-detail-descriptive-items'),
});

const orUndefined = (value: string): string | undefined => (value === '' ? undefined : value);

/** 検索条件フォームの入力値を読み取り、AND条件検索用のフィルタへ変換する（15章）。 */
export const readSearchFilterValues = (
  elements: Pick<ViewerSearchElements, 'recordedAtFrom' | 'recordedAtTo' | 'role' | 'name' | 'employeeNumber' | 'department'>,
): ExamResultSearchFilter => ({
  recordedAtFrom: orUndefined(elements.recordedAtFrom.value),
  recordedAtTo: orUndefined(elements.recordedAtTo.value),
  roleLabel: orUndefined(elements.role.value),
  name: orUndefined(elements.name.value),
  employeeNumber: orUndefined(elements.employeeNumber.value),
  department: orUndefined(elements.department.value),
});

/**
 * 検索結果一覧を描画する（15章）。0件の場合は「該当する受験結果がありません。」を表示する。
 * 各行はクリックまたはキーボード操作（Enter）で選択でき、選択時に onSelect が呼ばれる。
 */
export const renderSearchResults = (
  elements: Pick<ViewerSearchElements, 'emptyMessage' | 'resultTable' | 'resultTableBody'>,
  results: readonly ExamResultSummary[],
  onSelect: (rowNumber: number) => void,
): void => {
  elements.resultTableBody.replaceChildren();

  if (results.length === 0) {
    elements.emptyMessage.style.display = '';
    elements.resultTable.style.display = 'none';
    return;
  }

  elements.emptyMessage.style.display = 'none';
  elements.resultTable.style.display = '';

  for (const result of results) {
    const row = createEl('tr');
    row.style.cursor = 'pointer';
    row.tabIndex = 0;
    row.append(
      createEl('td', { text: formatRecordedAt(new Date(result.recordedAt)) }),
      createEl('td', { text: result.roleLabel }),
      createEl('td', { text: result.name }),
      createEl('td', { text: result.employeeNumber }),
      createEl('td', { text: result.department }),
      createEl('td', { text: `${result.overallCorrectRate}%` }),
    );
    row.addEventListener('click', () => onSelect(result.rowNumber));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        onSelect(result.rowNumber);
      }
    });
    elements.resultTableBody.appendChild(row);
  }
};

/** 選択された受験結果の詳細を、採点結果画面と同等のレイアウトで描画する（15章）。 */
export const renderExamResultDetail = (elements: ViewerDetailElements, detail: ExamResultDetail): void => {
  elements.roleTag.textContent = detail.roleLabel;
  elements.name.textContent = detail.name;
  elements.employee.textContent =
    detail.employeeNumber !== '' || detail.department !== '' ? `${detail.employeeNumber} ／ ${detail.department}` : '—';
  elements.duration.textContent = detail.durationText;
  elements.recordedAt.textContent = formatRecordedAt(new Date(detail.recordedAt));
  populateScoreCmyk(elements.scoreCmyk, detail.overallCorrectRate);
  elements.choiceSummary.textContent = `全${detail.questionCount}問の得点合計 ${detail.totalScore}点（選択式は正誤、記述式はGemini採点結果を含む）`;
  renderCategoryScoreTable(elements.categoryTableBody, detail.categoryScores);

  elements.descriptiveItems.replaceChildren();
  detail.answerDetails
    .filter((item) => item.format === 'text')
    .forEach((item, index) => {
      const card = createEl('div', { className: 'descriptive-score-card' });
      const dl = createEl('dl');
      dl.append(
        createEl('dt', { text: `記述式${index + 1} 入力回答` }),
        createEl('dd', { text: item.answerContent.trim() === '' ? '（未回答）' : item.answerContent }),
        createEl('dt', { text: 'スコア' }),
        createEl('dd', { text: `${item.score}点` }),
        createEl('dt', { text: '参考回答' }),
        createEl('dd', { text: item.modelAnswer ?? '' }),
        createEl('dt', { text: 'フィードバック' }),
        createEl('dd', { text: item.feedback ?? '' }),
      );
      card.appendChild(dl);
      elements.descriptiveItems.appendChild(card);
    });

  elements.section.style.display = 'flex';
};

/** 検索・詳細表示画面（Access Key検証後）の操作を配線する（15章）。 */
const bindViewerSearch = (accessKey: string): void => {
  const searchElements = getViewerSearchElements();
  const detailElements = getViewerDetailElements();

  const handleSelect = async (rowNumber: number): Promise<void> => {
    try {
      const detail = await fetchExamResultDetail(accessKey, rowNumber);
      renderExamResultDetail(detailElements, detail);
      detailElements.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      window.alert('受験結果の取得に失敗しました。時間をおいて再度お試しください。');
      // eslint-disable-next-line no-console
      console.error('fetchExamResultDetail failed', error);
    }
  };

  const handleSearch = async (): Promise<void> => {
    searchElements.searchButton.disabled = true;
    try {
      const filter = readSearchFilterValues(searchElements);
      const results = await searchExamResults(accessKey, filter);
      renderSearchResults(searchElements, results, (rowNumber) => {
        void handleSelect(rowNumber);
      });
    } catch (error) {
      window.alert('検索に失敗しました。時間をおいて再度お試しください。');
      // eslint-disable-next-line no-console
      console.error('searchExamResults failed', error);
    } finally {
      searchElements.searchButton.disabled = false;
    }
  };

  searchElements.searchButton.addEventListener('click', () => {
    void handleSearch();
  });
};

/**
 * Access Key入力画面の「開く」ボタンにクリックハンドラを配線する（15章）。
 * 検証に成功した場合のみ閲覧画面（検索・詳細表示）を表示し、以降の検索・詳細取得は
 * 入力されたAccess Keyを都度サーバーへ渡して再検証させる（クライアントの画面状態を信用しない）。
 */
export const bindViewerAccessKeyScreen = (): void => {
  const screen = getRequiredElement('viewer-access-key-screen');
  const input = getRequiredElement<HTMLInputElement>('viewer-access-key-input');
  const submitButton = getRequiredElement<HTMLButtonElement>('viewer-access-key-submit-button');
  const errorMessage = getRequiredElement('viewer-access-key-error');
  const logRowNumber = Number(screen.dataset.logRowNumber);

  const handleSubmit = async (): Promise<void> => {
    submitButton.disabled = true;
    errorMessage.style.display = 'none';
    try {
      const isValid = await verifyViewerAccessKey(logRowNumber, input.value);
      if (!isValid) {
        errorMessage.style.display = '';
        return;
      }
      screen.style.display = 'none';
      getRequiredElement('viewer-screen').style.display = '';
      bindViewerSearch(input.value);
    } catch (error) {
      window.alert('Access Keyの確認に失敗しました。時間をおいて再度お試しください。');
      // eslint-disable-next-line no-console
      console.error('verifyViewerAccessKey failed', error);
    } finally {
      submitButton.disabled = false;
    }
  };

  submitButton.addEventListener('click', () => {
    void handleSubmit();
  });
};
