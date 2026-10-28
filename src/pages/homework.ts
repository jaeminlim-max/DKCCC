// 과제 — 진행안 1-(4). ① 사영리 읽어 주기 ② 3분 간증문. 모두 이 폰에만 저장.
import { initPage } from '../lib/page';
import { $, debounce, h, toast } from '../lib/dom';
import { load, remove, save, warnIfNoStorage } from '../lib/storage';
import { createTimer } from '../lib/timer';
import { copyText, shareText } from '../lib/share';
import { HOMEWORK } from '../content';

initPage();

const KEY = 'homework';
interface Data {
  read: boolean;
  answers: string[];
}
const data = load<Data>(KEY, { read: false, answers: ['', '', ''] });
if (!Array.isArray(data.answers) || data.answers.length !== 3) data.answers = ['', '', ''];

const { task1: t1, task2: t2 } = HOMEWORK;
const app = $('#app');
app.innerHTML = `
  <div class="page-head">
    <h1>${HOMEWORK.title}</h1>
    <p class="where">${HOMEWORK.where}</p>
  </div>
  <div class="segment" role="tablist" aria-label="과제">
    <button type="button" role="tab" id="tab-1" aria-controls="panel-1">① ${t1.name}</button>
    <button type="button" role="tab" id="tab-2" aria-controls="panel-2">② ${t2.name}</button>
  </div>

  <section id="panel-1" role="tabpanel" aria-labelledby="tab-1">
    <div class="section stack">
      <p class="lead" id="t1-instruction"></p>
      <h2>${t1.beforeLabel}</h2>
      <p class="quote lead" id="t1-intro"></p>
    </div>
    <div class="section">
      <label class="check read-check"><input type="checkbox" id="read"> 읽어 줬어요</label>
    </div>
    <div class="section">
      <h2>성공적인 전도</h2>
      <p class="quote lead" id="t1-def"></p>
    </div>
  </section>

  <section id="panel-2" role="tabpanel" aria-labelledby="tab-2" hidden>
    <div class="section stack" id="answers"></div>
    <p class="save-state" id="state" aria-live="polite"></p>
    <div class="section">
      <h2>피할 것</h2>
      <ul class="avoid" id="avoid"></ul>
    </div>
    <div class="section" id="timer-slot">
      <h2>3분 낭독</h2>
      <p class="note">소리 내어 읽으며 길이를 맞춰 보세요.</p>
    </div>
    <div class="section">
      <p class="quote" id="submit"></p>
    </div>
  </section>

  <div class="section">
    <button type="button" class="btn btn-quiet btn-danger" id="clear">이 폰에서 지우기</button>
  </div>
  <div class="bottom-bar"><div class="inner" id="bar"></div></div>
`;
warnIfNoStorage($('#panel-1'));
$('#t1-instruction').textContent = t1.instruction;
$('#t1-intro').textContent = t1.intro;
$('#t1-def').textContent = t1.definition;
$('#submit').textContent = t2.submit;
for (const a of t2.avoid) $('#avoid').append(h('li', { text: a }));

/* ① */
const read = $<HTMLInputElement>('#read');
read.checked = !!data.read;
read.addEventListener('change', () => {
  data.read = read.checked;
  save(KEY, data);
});

/* ② */
const boxes = t2.questions.map((q, i) => {
  const ta = h('textarea', { rows: '6', id: `a${i}` });
  ta.value = data.answers[i] ?? '';
  $('#answers').append(h('label', { class: 'field', for: `a${i}` }, h('span', { text: `${i + 1}. ${q}` }), ta));
  return ta;
});
const persist = debounce(() => {
  data.answers = boxes.map((b) => b.value);
  save(KEY, data);
  $('#state').textContent = '이 폰에 저장됨';
}, 500);
boxes.forEach((b) => b.addEventListener('input', persist));

$('#timer-slot').append(createTimer({ seconds: 180, startText: '낭독 시작' }));

function compose(): string {
  const parts = t2.questions.map((q, i) => `${i + 1}. ${q}\n${boxes[i].value.trim()}`);
  return `3분 간증문\n\n${parts.join('\n\n')}`;
}

/* 하단 버튼 */
const bar = $('#bar');
const copyBtn = h('button', { class: 'btn', type: 'button', text: '복사하기' });
const shareBtn = h('button', { class: 'btn btn-primary', type: 'button', text: '공유하기' });
copyBtn.addEventListener('click', async () => {
  toast((await copyText(compose())) ? '복사했어요' : '복사가 안 됐어요. 글을 길게 눌러 직접 복사해 주세요.');
});
shareBtn.addEventListener('click', () => void shareText('3분 간증문', compose()));
const goTask2 = h('button', { class: 'btn btn-primary', type: 'button', text: '② 3분 간증문 쓰기' });
goTask2.addEventListener('click', () => select(2));

function select(n: 1 | 2): void {
  for (const i of [1, 2]) {
    $(`#tab-${i}`).setAttribute('aria-selected', String(i === n));
    $(`#panel-${i}`).hidden = i !== n;
  }
  bar.replaceChildren(...(n === 1 ? [goTask2] : [copyBtn, shareBtn]));
  save('homework-tab', n);
}
$('#tab-1').addEventListener('click', () => select(1));
$('#tab-2').addEventListener('click', () => {
  select(2);
});
select(load<number>('homework-tab', 1) === 2 ? 2 : 1);

$('#clear').addEventListener('click', () => {
  if (!window.confirm('체크와 간증문을 이 폰에서 지울까요?')) return;
  remove(KEY);
  data.read = false;
  data.answers = ['', '', ''];
  read.checked = false;
  boxes.forEach((b) => (b.value = ''));
  $('#state').textContent = '';
  toast('지웠어요');
});
