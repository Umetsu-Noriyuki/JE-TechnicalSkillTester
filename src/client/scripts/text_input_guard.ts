import { createEl } from "./dom_helpers";

/**
 * 受験画面のカンニング防止（9-5章）。
 * 記述式の入力欄へのペースト・ドラッグ＆ドロップ・右クリック・禁止ショートカットと、
 * 設問（問題文・入力欄）のコピー・切り取り・ドラッグによる持ち出しを抑止する。
 * 抑止した操作は onBlocked で呼び出し元へ通知し、回数の集計（11-2章 U列）に使う。
 */

/** Ctrl（macOSではCmd）と組み合わせた場合に抑止するキー（小文字で比較する）。 */
const BLOCKED_SHORTCUT_KEYS: ReadonlySet<string> = new Set([
  "a",
  "c",
  "v",
  "x",
  "y",
  "z",
]);

/** Shift+Insert（貼り付け）・Ctrl+Insert（コピー）として抑止するキー名。 */
const INSERT_KEY = "Insert";

/** 抑止対象とする beforeinput の inputType（ペースト・ドロップによる挿入）。 */
const BLOCKED_INPUT_TYPES: ReadonlySet<string> = new Set([
  "insertFromPaste",
  "insertFromDrop",
]);

/** 禁止操作を行った際に表示する案内文。 */
export const BLOCKED_OPERATION_MESSAGE =
  "この画面ではコピー・貼り付け等の操作は使用できません。";

/** 案内文を表示し続ける時間（ミリ秒）。 */
const BLOCKED_OPERATION_MESSAGE_DISPLAY_MILLISECONDS = 4000;

export type ShortcutKeyState = Pick<
  KeyboardEvent,
  "key" | "ctrlKey" | "metaKey" | "shiftKey"
>;

/** 押下されたキーの組み合わせが、抑止対象のキーボードショートカットかどうかを判定する。 */
export const isBlockedShortcutKey = (event: ShortcutKeyState): boolean => {
  const isCommandModifierPressed = event.ctrlKey || event.metaKey;
  if (event.key === INSERT_KEY) {
    return event.shiftKey || isCommandModifierPressed;
  }
  return (
    isCommandModifierPressed &&
    BLOCKED_SHORTCUT_KEYS.has(event.key.toLowerCase())
  );
};

/** 操作を抑止し、回数集計のため onBlocked を呼ぶ。 */
const blockAndNotify = (event: Event, onBlocked: () => void): void => {
  event.preventDefault();
  onBlocked();
};

/**
 * 記述式の入力欄に、ペースト・ドロップ・右クリック・禁止ショートカットの抑止を設定する。
 * dragover はドロップを受け付けないために抑止するが、ドラッグ中に連続発生するため回数には数えない。
 * キーの押しっぱなしによる連続入力（repeat）も回数には数えない。
 */
export const applyTextInputGuard = (
  textarea: HTMLTextAreaElement,
  onBlocked: () => void,
): void => {
  textarea.addEventListener("paste", (event) =>
    blockAndNotify(event, onBlocked),
  );
  textarea.addEventListener("drop", (event) =>
    blockAndNotify(event, onBlocked),
  );
  textarea.addEventListener("contextmenu", (event) =>
    blockAndNotify(event, onBlocked),
  );
  textarea.addEventListener("dragover", (event) => event.preventDefault());
  textarea.addEventListener("beforeinput", (event) => {
    if (BLOCKED_INPUT_TYPES.has(event.inputType)) {
      blockAndNotify(event, onBlocked);
    }
  });
  textarea.addEventListener("keydown", (event) => {
    if (!isBlockedShortcutKey(event)) {
      return;
    }
    event.preventDefault();
    if (!event.repeat) {
      onBlocked();
    }
  });
};

/**
 * 設問全体（問題文・入力欄を含むコンテナ）に、コピー・切り取り・ドラッグによる持ち出しの抑止を設定する。
 * 入力欄内で発生したコピー等のイベントもバブリングによりここで抑止される。
 */
export const applyCopyGuard = (
  container: HTMLElement,
  onBlocked: () => void,
): void => {
  container.addEventListener("copy", (event) =>
    blockAndNotify(event, onBlocked),
  );
  container.addEventListener("cut", (event) =>
    blockAndNotify(event, onBlocked),
  );
  container.addEventListener("dragstart", (event) =>
    blockAndNotify(event, onBlocked),
  );
};

export interface BlockedOperationNotice {
  element: HTMLElement;
  show: () => void;
}

/**
 * 禁止操作時の案内文要素を作成する。show() で一定時間だけ表示し、
 * 表示中に再度 show() された場合は表示時間を延長する。
 */
export const createBlockedOperationNotice = (): BlockedOperationNotice => {
  const element = createEl("p", {
    className: "quiz-guard-message",
    text: BLOCKED_OPERATION_MESSAGE,
  });
  element.setAttribute("role", "alert");
  element.style.display = "none";

  let hideTimerId: ReturnType<typeof setTimeout> | undefined;
  const show = (): void => {
    element.style.display = "";
    if (hideTimerId !== undefined) {
      clearTimeout(hideTimerId);
    }
    hideTimerId = setTimeout(() => {
      element.style.display = "none";
      hideTimerId = undefined;
    }, BLOCKED_OPERATION_MESSAGE_DISPLAY_MILLISECONDS);
  };

  return { element, show };
};
