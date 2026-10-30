// 이름 목록 입력 (추가·삭제). 기도 명단과 결단 카드가 함께 쓴다.
import { h } from './dom';

export function createNameList(opts: {
  names: string[];
  label: string;
  placeholder?: string;
  addText?: string; // 버튼 글자 (기본 '추가')
  max?: number; // 정하면 그 수를 넘을 때 앞의 이름을 밀어낸다 (1이면 한 명만)
  onChange: (names: string[]) => void;
}): { root: HTMLElement; set: (names: string[]) => void; add: (name: string) => void; input: HTMLInputElement } {
  let names = [...opts.names];
  const input = h('input', { type: 'text', maxlength: '30', autocomplete: 'off', enterkeyhint: 'done', 'aria-label': opts.label, placeholder: opts.placeholder ?? '이름' });
  const addBtn = h('button', { class: 'btn', type: 'button', text: opts.addText ?? '추가' });
  const list = h('ul', { class: 'name-list', 'aria-label': opts.label + ' 목록' });

  const render = () => {
    list.replaceChildren(
      ...names.map((n, i) => {
        const del = h('button', { type: 'button', 'aria-label': `${n} 빼기` });
        del.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
        del.addEventListener('click', () => {
          names.splice(i, 1);
          render();
          opts.onChange(names);
        });
        return h('li', {}, h('span', { text: n }), del);
      }),
    );
  };

  const add = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (!names.includes(name)) names.push(name);
    if (opts.max && names.length > opts.max) names = names.slice(-opts.max);
    render();
    opts.onChange(names);
  };

  addBtn.addEventListener('click', () => {
    add(input.value);
    input.value = '';
    input.focus();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      add(input.value);
      input.value = '';
    }
  });

  render();
  const root = h('div', { class: 'names' }, h('div', { class: 'add-row' }, input, addBtn), list);
  return {
    root,
    input,
    add,
    set: (next) => {
      names = [...next];
      render();
    },
  };
}
