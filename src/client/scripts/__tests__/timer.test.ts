import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createExamTimer, formatDurationJapanese, formatElapsedTime, isRemainingTimeWarning, isTimeUp } from '../timer';

describe('formatDurationJapanese', () => {
  test.each([
    [0, '0分0秒'],
    [61, '1分1秒'],
    [1661, '27分41秒'],
    [1800, '30分0秒'],
  ])('%i秒 -> %s', (seconds, expected) => {
    expect(formatDurationJapanese(seconds)).toBe(expected);
  });
});

describe('formatElapsedTime', () => {
  test.each([
    [0, '00:00'],
    [59, '00:59'],
    [60, '01:00'],
    [754, '12:34'],
    [1800, '30:00'],
  ])('%i秒 -> %s', (seconds, expected) => {
    expect(formatElapsedTime(seconds)).toBe(expected);
  });
});

describe('isRemainingTimeWarning', () => {
  test('残り5分ちょうどの場合はtrue', () => {
    expect(isRemainingTimeWarning(1500)).toBe(true);
  });

  test('残り5分1秒の場合はfalse', () => {
    expect(isRemainingTimeWarning(1499)).toBe(false);
  });
});

describe('isTimeUp', () => {
  test('30分未満はfalse', () => {
    expect(isTimeUp(1799)).toBe(false);
  });

  test('30分に達したらtrue', () => {
    expect(isTimeUp(1800)).toBe(true);
  });
});

describe('createExamTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('start()直後に0秒でonTickが呼ばれ、以降1秒ごとに呼ばれる', () => {
    const onTick = vi.fn();
    const onTimeUp = vi.fn();
    const timer = createExamTimer({ onTick, onTimeUp });

    timer.start();
    expect(onTick).toHaveBeenNthCalledWith(1, 0);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenNthCalledWith(2, 1);

    vi.advanceTimersByTime(2000);
    expect(onTick).toHaveBeenNthCalledWith(4, 3);
  });

  test('制限時間(1800秒)に達するとonTimeUpが1度だけ呼ばれ、以降onTickは呼ばれなくなる', () => {
    const onTick = vi.fn();
    const onTimeUp = vi.fn();
    const timer = createExamTimer({ onTick, onTimeUp });

    timer.start();
    vi.advanceTimersByTime(1800 * 1000);

    expect(onTimeUp).toHaveBeenCalledTimes(1);
    const callCountAtTimeUp = onTick.mock.calls.length;

    vi.advanceTimersByTime(5000);
    expect(onTick.mock.calls.length).toBe(callCountAtTimeUp);
  });

  test('stop()を呼ぶとタイマーが停止する', () => {
    const onTick = vi.fn();
    const onTimeUp = vi.fn();
    const timer = createExamTimer({ onTick, onTimeUp });

    timer.start();
    timer.stop();
    const callCountAfterStop = onTick.mock.calls.length;

    vi.advanceTimersByTime(5000);
    expect(onTick.mock.calls.length).toBe(callCountAfterStop);
  });
});
