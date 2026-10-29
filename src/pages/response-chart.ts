// 반응대처법 도표 — 상대의 대답을 누르면 다음에 할 말·행동이 이어진다. 저장 없음.
import { initPage } from '../lib/page';
import { $, h, prefersReducedMotion } from '../lib/dom';
import { CHART, type ChartNode, type ChartStep } from '../content';
import '../styles/chart.css';

initPage();

const KIND_LABEL: Record<ChartStep['kind'], string> = { ask: '묻기', say: '말하기', do: '하기' };

const app = $('#app');
app.innerHTML = `
  <div class="page-head">
    <h1>${CHART.title}</h1>
    <p class="where">${CHART.where}</p>
  </div>
  <div class="segment" role="tablist" aria-label="보기 방식">
    <button type="button" role="tab" id="tab-flow" aria-controls="flow">대답 따라가기</button>
    <button type="button" role="tab" id="tab-all" aria-controls="all">전체 도표</button>
  </div>
  <section id="flow" role="tabpanel" aria-labelledby="tab-flow">
    <p class="note section">상대의 대답을 누르면 다음에 할 말이 나옵니다.</p>
    <ol class="chat" id="chat" aria-live="polite"></ol>
  </section>
  <section id="all" role="tabpanel" aria-labelledby="tab-all" hidden></section>
  <div class="bottom-bar" id="bar"><div class="inner">
    <button type="button" class="btn" id="back">한 단계 뒤로</button>
    <button type="button" class="btn btn-primary" id="restart">처음부터</button>
  </div></div>
`;

function stepEl(s: ChartStep): HTMLElement {
  const head = h('span', { class: 'step-kind', text: KIND_LABEL[s.kind] + (s.page ? ` · ${s.page}` : '') });
  return h('div', { class: `cstep is-${s.kind}` }, head, h('p', { text: s.kind === 'do' ? s.text : `“${s.text}”` }));
}

/* 대답 따라가기 */
const chat = $('#chat');
let path: { node: string; answer?: string }[] = [];

function render(): void {
  chat.replaceChildren();
  path.forEach((p, i) => {
    const node = CHART.nodes[p.node];
    const li = h('li', { class: 'turn' }, ...node.steps.map(stepEl));
    const last = i === path.length - 1;
    if (!last && p.answer && (node.answers?.length ?? 0) > 1) li.append(h('p', { class: 'picked', text: `대답: ${p.answer}` }));
    if (last) {
      if (node.answers?.length) {
        const row = h('div', { class: 'answers' });
        row.append(h('p', { class: 'answers-label', text: node.answers.length > 1 ? '상대의 대답은?' : '' }));
        for (const a of node.answers) {
          const b = h('button', { type: 'button', class: 'btn answer', text: a.label });
          b.addEventListener('click', () => {
            p.answer = a.label;
            path.push({ node: a.next });
            render();
            const turns = chat.querySelectorAll('.turn');
            turns[turns.length - 1]?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
          });
          row.append(b);
        }
        li.append(row);
      } else {
        li.append(h('p', { class: 'end-mark', text: '여기까지입니다.' }));
      }
    }
    if (last && i > 0) li.classList.add('is-new');
    chat.append(li);
  });
  $<HTMLButtonElement>('#back').disabled = path.length <= 1;
}

function restart(): void {
  path = [{ node: CHART.start }];
  render();
  window.scrollTo({ top: 0 });
}
$('#restart').addEventListener('click', restart);
$('#back').addEventListener('click', () => {
  if (path.length <= 1) return;
  path.pop();
  delete path[path.length - 1].answer;
  render();
});
restart();

/* 전체 도표: 질문 Q1·Q2·Q3 아래로 갈래를 펼친다 */
function tree(id: string, depth: number, seen: Set<string>): HTMLElement {
  const node: ChartNode = CHART.nodes[id];
  const box = h('div', { class: 'tnode' }, ...node.steps.map(stepEl));
  for (const a of node.answers ?? []) {
    const next = CHART.nodes[a.next];
    const isJump = /^q\d$/.test(a.next) && a.next !== id;
    const branch = h('div', { class: 'tbranch' }, h('p', { class: 'tlabel', text: a.label }));
    if (isJump) branch.append(h('p', { class: 'tjump', text: `→ ${a.next.toUpperCase()}로` }));
    else if (next && !seen.has(a.next)) branch.append(tree(a.next, depth + 1, seen));
    box.append(branch);
  }
  return box;
}
const all = $('#all');
for (const q of ['q1', 'q2', 'q3']) {
  all.append(h('section', { class: 'section tq' }, h('h2', { text: q.toUpperCase() }), tree(q, 0, new Set())));
}
all.append(h('p', { class: 'note section', text: '학생용 교재 70p 도표를 옮긴 것입니다.' }));

function select(view: 'flow' | 'all'): void {
  $('#tab-flow').setAttribute('aria-selected', String(view === 'flow'));
  $('#tab-all').setAttribute('aria-selected', String(view === 'all'));
  $('#flow').hidden = view !== 'flow';
  all.hidden = view !== 'all';
  $('#bar').hidden = view !== 'flow';
}
$('#tab-flow').addEventListener('click', () => select('flow'));
$('#tab-all').addEventListener('click', () => select('all'));
select('flow');
