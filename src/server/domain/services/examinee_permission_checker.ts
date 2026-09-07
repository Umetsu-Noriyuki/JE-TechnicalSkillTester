const SPACE_PATTERN = /[ 　]/g;

/** 半角スペース・全角スペースを全て除去する（6-3章）。 */
const stripSpaces = (value: string): string => value.replace(SPACE_PATTERN, '');

/**
 * 入力された氏名が、許可された氏名一覧に含まれるかを判定する（6-3章：入社希望者のみ）。
 * 比較は、双方の文字列から半角スペース・全角スペースを除去したうえで完全一致で行う。
 */
export const isNameAllowed = (inputName: string, allowedNames: readonly string[]): boolean => {
  const normalizedInput = stripSpaces(inputName);
  return allowedNames.some((allowedName) => stripSpaces(allowedName) === normalizedInput);
};
