/**
 * Fisher–Yates シャッフル。入力配列を変更せず、新しい配列を返す。
 * 乱数生成には Math.random() を用いる（7-3章）。
 */
export const shuffle = <T>(items: readonly T[]): T[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
