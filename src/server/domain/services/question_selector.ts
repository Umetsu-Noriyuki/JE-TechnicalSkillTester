import { CATEGORY_QUOTA } from '../../../shared/constants';
import type { Question } from '../models/question';
import { shuffle } from './shuffle';

const groupByCategory = (questions: readonly Question[]): Map<string, Question[]> => {
  const groups = new Map<string, Question[]>();
  for (const question of questions) {
    const group = groups.get(question.category) ?? [];
    group.push(question);
    groups.set(question.category, group);
  }
  return groups;
};

const selectFromCategory = (categoryQuestions: readonly Question[]): Question[] => {
  if (categoryQuestions.length <= CATEGORY_QUOTA) {
    return shuffle(categoryQuestions);
  }

  const descriptiveQuestions = categoryQuestions.filter((question) => question.format === 'text');
  const choiceQuestions = categoryQuestions.filter((question) => question.format === 'choice');

  if (descriptiveQuestions.length === 0) {
    return shuffle(choiceQuestions).slice(0, CATEGORY_QUOTA);
  }

  const descriptiveRatio = descriptiveQuestions.length / categoryQuestions.length;
  const descriptiveTarget = Math.max(
    1,
    Math.min(Math.round(CATEGORY_QUOTA * descriptiveRatio), descriptiveQuestions.length),
  );
  const choiceTarget = Math.min(CATEGORY_QUOTA - descriptiveTarget, choiceQuestions.length);

  return [
    ...shuffle(descriptiveQuestions).slice(0, descriptiveTarget),
    ...shuffle(choiceQuestions).slice(0, choiceTarget),
  ];
};

/**
 * 「問題マスタ」全問から、区分ごとの抽出ロジック（7-2, 7-3章）に従い出題セットを作る。
 * 抽出後、区分をまたいで出題順をシャッフルする（7-4章：区分名は受験者に開示しない）。
 */
export const selectExamQuestions = (allQuestions: readonly Question[]): Question[] => {
  const groups = groupByCategory(allQuestions);
  const selected = [...groups.values()].flatMap(selectFromCategory);
  return shuffle(selected);
};
