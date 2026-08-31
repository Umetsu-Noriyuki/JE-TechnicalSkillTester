import { afterEach, describe, expect, test, vi } from 'vitest';
import { shuffle } from '../shuffle';

describe('shuffle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('元の配列と同じ要素を同じ数だけ含む', () => {
    const input = [1, 2, 3, 4, 5];

    const result = shuffle(input);

    expect([...result].sort()).toEqual([...input].sort());
  });

  test('引数の配列を変更しない', () => {
    const input = [1, 2, 3];
    const copy = [...input];

    shuffle(input);

    expect(input).toEqual(copy);
  });

  test('Math.randomが常に0を返す場合、Fisher-Yatesの結果として配列が反転する', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = shuffle([1, 2, 3, 4]);

    expect(result).toEqual([2, 3, 4, 1]);
  });
});
