/** DOM要素を作成する汎用ヘルパー。クライアント側の各描画処理から共通で利用する。 */
export const createEl = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: { className?: string; text?: string },
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  if (options?.className !== undefined) {
    element.className = options.className;
  }
  if (options?.text !== undefined) {
    element.textContent = options.text;
  }
  return element;
};

/** IDを指定してDOM要素を取得する。見つからない場合は例外を投げる（テンプレートとJSのID不一致を早期発見するため）。 */
export const getRequiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`要素が見つかりません: #${id}`);
  }
  return element as T;
};
