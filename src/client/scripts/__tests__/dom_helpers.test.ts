// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { createEl, getRequiredElement } from '../dom_helpers';

describe('createEl', () => {
  test('タグ名のみを指定した場合、className・textContentは未設定のまま要素を作る', () => {
    const el = createEl('div');

    expect(el.tagName).toBe('DIV');
    expect(el.className).toBe('');
    expect(el.textContent).toBe('');
  });

  test('classNameとtextを指定した場合、それぞれ反映される', () => {
    const el = createEl('span', { className: 'tag tag-accent', text: 'こんにちは' });

    expect(el.className).toBe('tag tag-accent');
    expect(el.textContent).toBe('こんにちは');
  });
});

describe('getRequiredElement', () => {
  test('存在するIDの要素を返す', () => {
    document.body.innerHTML = '<div id="target"></div>';

    expect(getRequiredElement('target')).toBe(document.getElementById('target'));
  });

  test('存在しないIDの場合は例外を投げる', () => {
    document.body.innerHTML = '';

    expect(() => getRequiredElement('missing')).toThrow('要素が見つかりません: #missing');
  });
});
