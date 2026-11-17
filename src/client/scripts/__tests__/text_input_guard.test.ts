// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  BLOCKED_OPERATION_MESSAGE,
  applyCopyGuard,
  applyTextInputGuard,
  createBlockedOperationNotice,
  isBlockedShortcutKey,
  type ShortcutKeyState,
} from "../text_input_guard";

const keyState = (overrides: Partial<ShortcutKeyState>): ShortcutKeyState => ({
  key: "a",
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...overrides,
});

describe("isBlockedShortcutKey", () => {
  test.each(["v", "c", "x", "a", "z", "y"])(
    "【禁止】Ctrl+%s は抑止対象",
    (key) => {
      expect(isBlockedShortcutKey(keyState({ key, ctrlKey: true }))).toBe(true);
    },
  );

  test.each(["v", "c", "x", "a", "z", "y"])(
    "【禁止】Cmd(Meta)+%s は抑止対象（macOS）",
    (key) => {
      expect(isBlockedShortcutKey(keyState({ key, metaKey: true }))).toBe(true);
    },
  );

  test("【禁止】CapsLock等で大文字になっていても抑止対象（Ctrl+V）", () => {
    expect(
      isBlockedShortcutKey(
        keyState({ key: "V", ctrlKey: true, shiftKey: true }),
      ),
    ).toBe(true);
  });

  test("【禁止】Shift+Insert（貼り付け）は抑止対象", () => {
    expect(
      isBlockedShortcutKey(keyState({ key: "Insert", shiftKey: true })),
    ).toBe(true);
  });

  test("【禁止】Ctrl+Insert（コピー）は抑止対象", () => {
    expect(
      isBlockedShortcutKey(keyState({ key: "Insert", ctrlKey: true })),
    ).toBe(true);
  });

  test("【許可】修飾キーなしの文字入力は抑止しない", () => {
    expect(isBlockedShortcutKey(keyState({ key: "v" }))).toBe(false);
  });

  test("【許可】Shiftのみ押下した大文字入力は抑止しない", () => {
    expect(isBlockedShortcutKey(keyState({ key: "V", shiftKey: true }))).toBe(
      false,
    );
  });

  test("【許可】修飾キーなしのInsertは抑止しない", () => {
    expect(isBlockedShortcutKey(keyState({ key: "Insert" }))).toBe(false);
  });

  test.each(["Backspace", "ArrowLeft", "Tab", "Enter", "b"])(
    "【許可】Ctrlと組み合わせても対象外のキー（%s）は抑止しない",
    (key) => {
      expect(isBlockedShortcutKey(keyState({ key, ctrlKey: true }))).toBe(
        false,
      );
    },
  );
});

describe("applyTextInputGuard", () => {
  let textarea: HTMLTextAreaElement;
  let onBlocked: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    textarea = document.createElement("textarea");
    onBlocked = vi.fn<() => void>();
    applyTextInputGuard(textarea, onBlocked);
  });

  const dispatch = (event: Event): Event => {
    textarea.dispatchEvent(event);
    return event;
  };

  test.each(["paste", "drop", "contextmenu"])(
    "【禁止】%s を抑止し、onBlockedを1回呼ぶ",
    (type) => {
      const event = dispatch(
        new Event(type, { bubbles: true, cancelable: true }),
      );

      expect(event.defaultPrevented).toBe(true);
      expect(onBlocked).toHaveBeenCalledTimes(1);
    },
  );

  test("【禁止】dragoverは抑止するが、ドラッグ中に連続発生するため回数には数えない", () => {
    const event = dispatch(
      new Event("dragover", { bubbles: true, cancelable: true }),
    );

    expect(event.defaultPrevented).toBe(true);
    expect(onBlocked).not.toHaveBeenCalled();
  });

  test.each(["insertFromPaste", "insertFromDrop"])(
    "【禁止】beforeinput（%s）を抑止する",
    (inputType) => {
      const event = dispatch(
        new InputEvent("beforeinput", {
          inputType,
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(event.defaultPrevented).toBe(true);
      expect(onBlocked).toHaveBeenCalledTimes(1);
    },
  );

  test("【許可】通常の文字入力によるbeforeinput（insertText）は抑止しない", () => {
    const event = dispatch(
      new InputEvent("beforeinput", {
        inputType: "insertText",
        data: "a",
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(event.defaultPrevented).toBe(false);
    expect(onBlocked).not.toHaveBeenCalled();
  });

  test("【禁止】Ctrl+Vのkeydownを抑止し、onBlockedを呼ぶ", () => {
    const event = dispatch(
      new KeyboardEvent("keydown", {
        key: "v",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(event.defaultPrevented).toBe(true);
    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  test("【禁止】キーの押しっぱなし（repeat）は抑止するが、回数には数えない", () => {
    const event = dispatch(
      new KeyboardEvent("keydown", {
        key: "v",
        ctrlKey: true,
        repeat: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(event.defaultPrevented).toBe(true);
    expect(onBlocked).not.toHaveBeenCalled();
  });

  test.each(["a", "Backspace", "ArrowLeft", "Tab"])(
    "【許可】通常のキー入力（%s）は抑止しない",
    (key) => {
      const event = dispatch(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );

      expect(event.defaultPrevented).toBe(false);
      expect(onBlocked).not.toHaveBeenCalled();
    },
  );
});

describe("applyCopyGuard", () => {
  test.each(["copy", "cut", "dragstart"])(
    "【禁止】コンテナ内の要素で発生した %s を抑止し、onBlockedを呼ぶ",
    (type) => {
      const container = document.createElement("div");
      const questionText = document.createElement("p");
      container.appendChild(questionText);
      const onBlocked = vi.fn();
      applyCopyGuard(container, onBlocked);

      const event = new Event(type, { bubbles: true, cancelable: true });
      questionText.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(onBlocked).toHaveBeenCalledTimes(1);
    },
  );

  test("【許可】対象外のイベント（click）は抑止しない", () => {
    const container = document.createElement("div");
    const onBlocked = vi.fn();
    applyCopyGuard(container, onBlocked);

    const event = new Event("click", { bubbles: true, cancelable: true });
    container.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onBlocked).not.toHaveBeenCalled();
  });
});

describe("createBlockedOperationNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("【正常系】案内文を含む要素を非表示状態で作成する", () => {
    const notice = createBlockedOperationNotice();

    expect(notice.element.textContent).toBe(BLOCKED_OPERATION_MESSAGE);
    expect(notice.element.className).toBe("quiz-guard-message");
    expect(notice.element.style.display).toBe("none");
  });

  test("【正常系】show()で表示し、一定時間経過後に非表示へ戻す", () => {
    const notice = createBlockedOperationNotice();

    notice.show();
    expect(notice.element.style.display).toBe("");

    vi.advanceTimersByTime(4000);
    expect(notice.element.style.display).toBe("none");
  });

  test("【分岐】表示中に再度show()すると表示時間を延長する", () => {
    const notice = createBlockedOperationNotice();

    notice.show();
    vi.advanceTimersByTime(3000);
    notice.show();
    vi.advanceTimersByTime(3000);
    expect(notice.element.style.display).toBe("");

    vi.advanceTimersByTime(1000);
    expect(notice.element.style.display).toBe("none");
  });
});
