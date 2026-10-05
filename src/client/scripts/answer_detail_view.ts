import type { AnswerDetail, AnswerDetailChoice } from '../../shared/types/answer_detail';
import { createEl } from './dom_helpers';

const FORMAT_LABEL: Record<AnswerDetail['format'], string> = {
  choice: '選択式',
  text: '記述式',
};

const FORMAT_TAG_CLASS: Record<AnswerDetail['format'], string> = {
  choice: 'tag tag-neutral',
  text: 'tag tag-accent',
};

const SCORE_HIGH_THRESHOLD = 80;
const SCORE_LOW_THRESHOLD = 50;

/**
 * 問題番号の下に表示する結果マークを組み立てる。
 * - 選択式：正解＝緑の「○」、不正解＝赤の「×」。未回答の場合はさらに赤字で「未回答」を添える。
 * - 記述式：スコアを表示（80点以上は緑、50点未満は赤、それ以外は既定色）。
 */
const buildResultMark = (detail: AnswerDetail): HTMLElement => {
  const group = createEl('div', { className: 'answer-result-mark-group' });

  if (detail.format === 'choice') {
    const markClass = detail.isCorrect ? 'answer-result-mark is-correct' : 'answer-result-mark is-incorrect';
    group.appendChild(createEl('div', { className: markClass, text: detail.isCorrect ? '○' : '×' }));
    if (detail.answerContent.trim() === '') {
      group.appendChild(createEl('div', { className: 'answer-result-unanswered', text: '未回答' }));
    }
    return group;
  }

  const scoreClass =
    detail.score >= SCORE_HIGH_THRESHOLD
      ? 'is-correct'
      : detail.score < SCORE_LOW_THRESHOLD
        ? 'is-incorrect'
        : '';
  group.appendChild(createEl('div', { className: `answer-result-mark ${scoreClass}`.trim(), text: `${detail.score}点` }));
  return group;
};

const buildCardHeader = (detail: AnswerDetail): HTMLElement => {
  const header = createEl('div', { className: 'answer-detail-card-header' });
  header.append(
    createEl('span', { className: FORMAT_TAG_CLASS[detail.format], text: FORMAT_LABEL[detail.format] }),
    createEl('span', { className: 'tag tag-outline', text: detail.category }),
  );
  return header;
};

/**
 * 選択肢1肢分の行を描画する（10-4, 15-4章）。
 * - 選択済み＆正解：チェック・太字・緑・語尾「：正解」
 * - 選択済み＆不正解：チェック・太字・赤・語尾「：間違い」
 * - 未選択＆正解（選択が誤り、または未回答の場合）：チェック無し・緑・語尾「：こちらが正解」
 * - それ以外：通常表示
 */
const buildChoiceRow = (choice: AnswerDetailChoice): HTMLElement => {
  const row = createEl('div', { className: 'answer-choice-row' });
  let suffix = '';

  if (choice.isSelected && choice.isCorrectChoice) {
    row.classList.add('is-correct-selected');
    suffix = '：正解';
  } else if (choice.isSelected && !choice.isCorrectChoice) {
    row.classList.add('is-incorrect-selected');
    suffix = '：間違い';
  } else if (!choice.isSelected && choice.isCorrectChoice) {
    row.classList.add('is-correct-unselected');
    suffix = '：こちらが正解';
  }

  row.append(
    createEl('span', { className: 'answer-choice-check', text: choice.isSelected ? '✓' : '' }),
    createEl('span', { text: `${choice.text}${suffix}` }),
  );
  return row;
};

const buildChoiceCardBody = (detail: AnswerDetail): HTMLElement => {
  const body = createEl('div', { className: 'answer-detail-card-body' });
  body.appendChild(createEl('p', { text: detail.questionText }));

  const choiceList = createEl('div', { className: 'answer-choice-list' });
  (detail.choices ?? []).forEach((choice) => choiceList.appendChild(buildChoiceRow(choice)));
  body.appendChild(choiceList);

  return body;
};

const buildDescriptiveCardBody = (detail: AnswerDetail): HTMLElement => {
  const body = createEl('div', { className: 'answer-detail-card-body' });
  body.appendChild(createEl('p', { text: detail.questionText }));

  const dl = createEl('dl');
  dl.append(
    createEl('dt', { text: '入力回答' }),
    createEl('dd', { text: detail.answerContent.trim() === '' ? '（未回答）' : detail.answerContent }),
    createEl('dt', { text: 'スコア' }),
    createEl('dd', { text: `${detail.score}点` }),
    createEl('dt', { text: '参考回答' }),
    createEl('dd', { text: detail.modelAnswer ?? '' }),
    createEl('dt', { text: 'フィードバック' }),
    createEl('dd', { text: detail.feedback ?? '' }),
  );
  body.appendChild(dl);

  return body;
};

/**
 * 回答詳細（選択式・記述式）を、受験画面と同じ問題順・同じ「Q1」形式の番号で一覧描画する（10-4, 15-4章）。
 * 採点結果画面・閲覧画面の両方から共通で利用する。
 */
export const renderAnswerDetailList = (container: HTMLElement, answerDetails: readonly AnswerDetail[]): void => {
  container.replaceChildren();

  answerDetails.forEach((detail, index) => {
    const card = createEl('div', { className: 'answer-detail-card' });

    const numberColumn = createEl('div', { className: 'answer-detail-number-column' });
    numberColumn.append(
      createEl('div', { className: 'quiz-question-number', text: `Q${index + 1}` }),
      buildResultMark(detail),
    );

    const content = createEl('div', { className: 'answer-detail-card-content' });
    content.appendChild(buildCardHeader(detail));
    content.appendChild(detail.format === 'choice' ? buildChoiceCardBody(detail) : buildDescriptiveCardBody(detail));

    card.append(numberColumn, content);
    container.appendChild(card);
  });
};
