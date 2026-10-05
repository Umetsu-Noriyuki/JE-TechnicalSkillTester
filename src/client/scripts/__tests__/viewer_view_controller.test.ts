// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ExamResultDetail } from '../../../shared/types/exam_result_detail';
import type { ExamResultSummary } from '../../../shared/types/exam_result_search';
import * as apiClient from '../api_client';
import {
  bindViewerAccessKeyScreen,
  readSearchFilterValues,
  renderExamResultDetail,
  renderSearchResults,
  triggerPdfDownload,
} from '../viewer_view_controller';

vi.mock('../api_client');

describe('readSearchFilterValues', () => {
  const buildRoleSelect = (value: string): HTMLSelectElement => {
    const select = document.createElement('select');
    if (value !== '') {
      const option = document.createElement('option');
      option.value = value;
      select.appendChild(option);
    }
    select.value = value;
    return select;
  };

  const buildElements = (values: Partial<Record<'recordedAtFrom' | 'recordedAtTo' | 'role' | 'name' | 'employeeNumber' | 'department', string>>) => ({
    recordedAtFrom: Object.assign(document.createElement('input'), { value: values.recordedAtFrom ?? '' }),
    recordedAtTo: Object.assign(document.createElement('input'), { value: values.recordedAtTo ?? '' }),
    role: buildRoleSelect(values.role ?? ''),
    name: Object.assign(document.createElement('input'), { value: values.name ?? '' }),
    employeeNumber: Object.assign(document.createElement('input'), { value: values.employeeNumber ?? '' }),
    department: Object.assign(document.createElement('input'), { value: values.department ?? '' }),
  });

  test('入力済みの項目のみをフィルタへ変換する', () => {
    const elements = buildElements({ name: '佐藤', role: '未経験の新入社員' });

    expect(readSearchFilterValues(elements)).toEqual({
      recordedAtFrom: undefined,
      recordedAtTo: undefined,
      roleLabel: '未経験の新入社員',
      name: '佐藤',
      employeeNumber: undefined,
      department: undefined,
    });
  });

  test('全項目未入力の場合は全てundefinedのフィルタになる', () => {
    const elements = buildElements({});

    expect(readSearchFilterValues(elements)).toEqual({
      recordedAtFrom: undefined,
      recordedAtTo: undefined,
      roleLabel: undefined,
      name: undefined,
      employeeNumber: undefined,
      department: undefined,
    });
  });

  test('全項目入力済みの場合はそのままフィルタへ反映される', () => {
    const elements = buildElements({
      recordedAtFrom: '2026-04-01',
      recordedAtTo: '2026-04-30',
      role: '入社希望者',
      name: '佐藤',
      employeeNumber: 'A1',
      department: '開発部',
    });

    expect(readSearchFilterValues(elements)).toEqual({
      recordedAtFrom: '2026-04-01',
      recordedAtTo: '2026-04-30',
      roleLabel: '入社希望者',
      name: '佐藤',
      employeeNumber: 'A1',
      department: '開発部',
    });
  });
});

describe('renderSearchResults', () => {
  const buildElements = () => ({
    emptyMessage: document.createElement('p'),
    resultTable: document.createElement('table'),
    resultTableBody: document.createElement('tbody'),
  });

  const buildSummary = (overrides: Partial<ExamResultSummary> = {}): ExamResultSummary => ({
    rowNumber: 2,
    recordedAt: '2026-04-10T05:32:00.000Z',
    roleLabel: '未経験の新入社員',
    name: '佐藤 美咲',
    employeeNumber: 'A123456',
    department: '開発部',
    overallCorrectRate: 85,
    ...overrides,
  });

  test('該当なしの場合は「該当する受験結果がありません。」を表示し、テーブルは非表示にする', () => {
    const elements = buildElements();

    renderSearchResults(elements, [], vi.fn());

    expect(elements.emptyMessage.style.display).toBe('');
    expect(elements.resultTable.style.display).toBe('none');
    expect(elements.resultTableBody.children).toHaveLength(0);
  });

  test('該当ありの場合は一覧を描画し、空メッセージを隠す', () => {
    const elements = buildElements();

    renderSearchResults(elements, [buildSummary(), buildSummary({ rowNumber: 3, name: '鈴木 一郎' })], vi.fn());

    expect(elements.emptyMessage.style.display).toBe('none');
    expect(elements.resultTable.style.display).toBe('');
    expect(elements.resultTableBody.children).toHaveLength(2);
    expect(elements.resultTableBody.textContent).toContain('佐藤 美咲');
    expect(elements.resultTableBody.textContent).toContain('鈴木 一郎');
  });

  test('行をクリックするとonSelectがrowNumberとともに呼ばれる', () => {
    const elements = buildElements();
    const onSelect = vi.fn();

    renderSearchResults(elements, [buildSummary({ rowNumber: 7 })], onSelect);
    elements.resultTableBody.querySelector('tr')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSelect).toHaveBeenCalledWith(7);
  });

  test('行にフォーカスしてEnterキーを押してもonSelectが呼ばれる（キーボード操作対応）', () => {
    const elements = buildElements();
    const onSelect = vi.fn();

    renderSearchResults(elements, [buildSummary({ rowNumber: 7 })], onSelect);
    const row = elements.resultTableBody.querySelector('tr');
    expect(row?.tabIndex).toBe(0);
    row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onSelect).toHaveBeenCalledWith(7);
  });
});

describe('renderExamResultDetail', () => {
  const buildElements = () => ({
    section: document.createElement('div'),
    downloadPdfButton: document.createElement('button'),
    roleTag: document.createElement('span'),
    name: document.createElement('dd'),
    employee: document.createElement('dd'),
    duration: document.createElement('dd'),
    recordedAt: document.createElement('dd'),
    scoreCmyk: (() => {
      const el = document.createElement('div');
      el.innerHTML = '<span class="paper">0</span><span class="plate">0</span>';
      return el;
    })(),
    choiceSummary: document.createElement('p'),
    categoryTableBody: document.createElement('tbody'),
    descriptiveItems: document.createElement('div'),
  });

  const buildDetail = (overrides: Partial<ExamResultDetail> = {}): ExamResultDetail => ({
    rowNumber: 2,
    recordedAt: '2026-04-10T05:32:00.000Z',
    roleLabel: '未経験の新入社員',
    name: '佐藤 美咲',
    employeeNumber: 'A123456',
    department: '開発部',
    overallCorrectRate: 85,
    durationText: '27分41秒（時間内に終了）',
    categoryScores: [{ categoryName: 'SQL', questionCount: 1, totalScore: 70, correctRate: 70, descriptiveSubmittedCount: 1 }],
    totalScore: 170,
    questionCount: 2,
    answerDetails: [
      {
        questionId: 'q1',
        category: 'コーディング',
        subCategory: 'if文',
        format: 'choice',
        questionText: '選択式の問題文',
        answerContent: 'A',
        score: 100,
        isCorrect: true,
      },
      {
        questionId: 'q2',
        category: 'SQL',
        subCategory: '集計',
        format: 'text',
        questionText: 'SQL文を書きなさい',
        answerContent: '回答内容',
        score: 70,
        modelAnswer: '模範回答',
        feedback: 'やや不足',
      },
    ],
    ...overrides,
  });

  test('受験者情報・総合正解率・分野別正解率を反映する', () => {
    const elements = buildElements();

    renderExamResultDetail(elements, buildDetail());

    expect(elements.roleTag.textContent).toBe('未経験の新入社員');
    expect(elements.name.textContent).toBe('佐藤 美咲');
    expect(elements.employee.textContent).toBe('A123456 ／ 開発部');
    expect(elements.duration.textContent).toBe('27分41秒（時間内に終了）');
    expect(Array.from(elements.scoreCmyk.children).map((el) => el.textContent)).toEqual(['85', '85']);
    expect(elements.choiceSummary.textContent).toContain('170点');
    expect(elements.categoryTableBody.querySelectorAll('td')[0]?.textContent).toBe('SQL');
    expect(elements.section.style.display).toBe('flex');
  });

  test('社員番号・所属が両方とも空の場合は"—"を表示する（入社希望者）', () => {
    const elements = buildElements();

    renderExamResultDetail(elements, buildDetail({ employeeNumber: '', department: '' }));

    expect(elements.employee.textContent).toBe('—');
  });

  test('選択式・記述式すべての回答詳細を、受験画面と同じ順序でカードとして描画する', () => {
    const elements = buildElements();

    renderExamResultDetail(elements, buildDetail());

    expect(elements.descriptiveItems.children).toHaveLength(2);
    const cardText = elements.descriptiveItems.textContent ?? '';
    expect(cardText).toContain('選択式の問題文');
    expect(cardText).toContain('SQL文を書きなさい');
    expect(cardText).toContain('回答内容');
    expect(cardText).toContain('70点');
    expect(cardText).toContain('模範回答');
    expect(cardText).toContain('やや不足');
  });
});

describe('triggerPdfDownload', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  test('Base64データからBlobを作成し、一時的なaタグ経由でダウンロードを実行してから後始末する', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    triggerPdfDownload(btoa('PDF'), '受験結果.pdf');

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = vi.mocked(URL.createObjectURL).mock.calls[0] as [Blob];
    expect(blob.type).toBe('application/pdf');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);

    clickSpy.mockRestore();
  });
});

describe('bindViewerAccessKeyScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="viewer-access-key-screen" data-log-row-number="4">
        <input id="viewer-access-key-input" />
        <button id="viewer-access-key-submit-button"></button>
        <p id="viewer-access-key-error" style="display: none"></p>
      </div>
      <div id="viewer-screen" style="display: none">
        <input id="viewer-search-recorded-at-from" />
        <input id="viewer-search-recorded-at-to" />
        <select id="viewer-search-role"></select>
        <input id="viewer-search-name" />
        <input id="viewer-search-employee-number" />
        <input id="viewer-search-department" />
        <button id="viewer-search-button"></button>
        <p id="viewer-search-empty-message" style="display: none"></p>
        <table id="viewer-search-result-table" style="display: none"><tbody id="viewer-search-result-table-body"></tbody></table>
        <div id="viewer-detail-section" style="display: none">
          <button id="viewer-detail-download-pdf-button"></button>
          <span id="viewer-detail-role-tag"></span>
          <dd id="viewer-detail-name"></dd>
          <dd id="viewer-detail-employee"></dd>
          <dd id="viewer-detail-duration"></dd>
          <dd id="viewer-detail-recorded-at"></dd>
          <div id="viewer-detail-score-cmyk"><span class="paper">0</span></div>
          <p id="viewer-detail-choice-summary"></p>
          <table><tbody id="viewer-detail-category-table-body"></tbody></table>
          <div id="viewer-detail-descriptive-items"></div>
        </div>
      </div>
    `;
  });

  test('正しいAccess Keyの場合、Access Key画面を隠し閲覧画面（検索）を表示する', async () => {
    vi.mocked(apiClient.verifyViewerAccessKey).mockResolvedValue(true);

    bindViewerAccessKeyScreen();
    (document.getElementById('viewer-access-key-input') as HTMLInputElement).value = 'secret-key';
    document.getElementById('viewer-access-key-submit-button')?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();
    await Promise.resolve();

    expect(apiClient.verifyViewerAccessKey).toHaveBeenCalledWith(4, 'secret-key');
    expect((document.getElementById('viewer-access-key-screen') as HTMLElement).style.display).toBe('none');
    expect((document.getElementById('viewer-screen') as HTMLElement).style.display).toBe('');
  });

  test('誤ったAccess Keyの場合、エラーメッセージを表示し画面は切り替えない', async () => {
    vi.mocked(apiClient.verifyViewerAccessKey).mockResolvedValue(false);

    bindViewerAccessKeyScreen();
    document.getElementById('viewer-access-key-submit-button')?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();
    await Promise.resolve();

    expect((document.getElementById('viewer-access-key-error') as HTMLElement).style.display).toBe('');
    expect((document.getElementById('viewer-screen') as HTMLElement).style.display).toBe('none');
  });

  test('検証成功後、検索ボタン押下でsearchExamResultsへ入力済みAccess Keyを渡して呼び出す', async () => {
    vi.mocked(apiClient.verifyViewerAccessKey).mockResolvedValue(true);
    vi.mocked(apiClient.searchExamResults).mockResolvedValue([]);

    bindViewerAccessKeyScreen();
    (document.getElementById('viewer-access-key-input') as HTMLInputElement).value = 'secret-key';
    document.getElementById('viewer-access-key-submit-button')?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();
    await Promise.resolve();

    document.getElementById('viewer-search-button')?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();
    await Promise.resolve();

    expect(apiClient.searchExamResults).toHaveBeenCalledWith('secret-key', expect.any(Object));
  });

  test('検索結果選択後、PDFダウンロードボタン押下でdownloadExamResultPdfを入力済みAccess Keyと選択中の行番号で呼び出す', async () => {
    vi.mocked(apiClient.verifyViewerAccessKey).mockResolvedValue(true);
    vi.mocked(apiClient.searchExamResults).mockResolvedValue([
      {
        rowNumber: 7,
        recordedAt: '2026-04-10T05:32:00.000Z',
        roleLabel: '未経験の新入社員',
        name: '佐藤 美咲',
        employeeNumber: 'A123456',
        department: '開発部',
        overallCorrectRate: 85,
      },
    ]);
    vi.mocked(apiClient.fetchExamResultDetail).mockResolvedValue({
      rowNumber: 7,
      recordedAt: '2026-04-10T05:32:00.000Z',
      roleLabel: '未経験の新入社員',
      name: '佐藤 美咲',
      employeeNumber: 'A123456',
      department: '開発部',
      overallCorrectRate: 85,
      durationText: '27分41秒（時間内に終了）',
      categoryScores: [],
      totalScore: 100,
      questionCount: 1,
      answerDetails: [],
    });
    vi.mocked(apiClient.downloadExamResultPdf).mockResolvedValue({ base64: btoa('PDF'), fileName: '受験結果.pdf' });

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    bindViewerAccessKeyScreen();
    (document.getElementById('viewer-access-key-input') as HTMLInputElement).value = 'secret-key';
    document.getElementById('viewer-access-key-submit-button')?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();
    await Promise.resolve();

    document.getElementById('viewer-search-button')?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    document.querySelector('#viewer-search-result-table-body tr')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    document.getElementById('viewer-detail-download-pdf-button')?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();
    await Promise.resolve();

    expect(apiClient.downloadExamResultPdf).toHaveBeenCalledWith('secret-key', 7);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  test('受験結果が未選択の場合、PDFダウンロードボタンを押してもdownloadExamResultPdfは呼ばれない', async () => {
    vi.mocked(apiClient.verifyViewerAccessKey).mockResolvedValue(true);

    bindViewerAccessKeyScreen();
    document.getElementById('viewer-access-key-submit-button')?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();
    await Promise.resolve();

    document.getElementById('viewer-detail-download-pdf-button')?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();

    expect(apiClient.downloadExamResultPdf).not.toHaveBeenCalled();
  });
});
