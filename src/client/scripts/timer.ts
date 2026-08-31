import { EXAM_DURATION_SECONDS, REMAINING_TIME_WARNING_SECONDS } from '../../shared/constants';

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** 経過秒数を mm:ss 形式に整形する（9-2章）。 */
export const formatElapsedTime = (elapsedSeconds: number): string => {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${pad2(minutes)}:${pad2(seconds)}`;
};

/** 残り時間が警告閾値（5分）以下かどうかを判定する（9-2章）。 */
export const isRemainingTimeWarning = (elapsedSeconds: number): boolean =>
  EXAM_DURATION_SECONDS - elapsedSeconds <= REMAINING_TIME_WARNING_SECONDS;

/** 制限時間に達したかどうかを判定する（9-1章）。 */
export const isTimeUp = (elapsedSeconds: number): boolean => elapsedSeconds >= EXAM_DURATION_SECONDS;

export interface ExamTimerHandlers {
  onTick: (elapsedSeconds: number) => void;
  onTimeUp: () => void;
}

export interface ExamTimer {
  start: () => void;
  stop: () => void;
}

/**
 * 1秒ごとに onTick を呼び出し、制限時間（30分）に達した時点で onTimeUp を一度だけ呼び出す
 * タイマー。開始直後（0秒時点）にも onTick を1回呼び出す。
 */
export const createExamTimer = ({ onTick, onTimeUp }: ExamTimerHandlers): ExamTimer => {
  let elapsedSeconds = 0;
  let intervalId: ReturnType<typeof setInterval> | undefined;

  const stop = (): void => {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  const tick = (): void => {
    elapsedSeconds += 1;
    onTick(elapsedSeconds);
    if (isTimeUp(elapsedSeconds)) {
      stop();
      onTimeUp();
    }
  };

  const start = (): void => {
    onTick(elapsedSeconds);
    intervalId = setInterval(tick, 1000);
  };

  return { start, stop };
};
