// 과제 — 진행안 1-(4). ① 사영리 읽어 주기 ② 3분 간증문.
// 쓰는 내용은 이 폰에 저장하고, [제출하기]를 누를 때만 간사님 Google 시트로 보낸다 (11/9까지).
import { initPage } from '../lib/page';
import { $, debounce, h, toast } from '../lib/dom';
import { load, remove, save, warnIfNoStorage } from '../lib/storage';
import { createTimer } from '../lib/timer';
import { copyText } from '../lib/share';
import { errorText, isOpen, serverReady, submitTestimony } from '../lib/api';
import { HOMEWORK } from '../content';

initPage();

const KEY = 'homework';
interface Data {
  read: boolean;
  name: string;
  answers: string[];
  submittedAt?: string;
}
const data = load<Data>(KEY, { read: false, name: '', answers: ['', '', ''] });
if (typeof data.name !== 'string') data.name = '';
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
    <div class="section stack" id="answers">
      <label class="field" for="name"><span>이름</span><input type="text" id="name" maxlength="40" autocomplete="name" enterkeyhint="next"></label>
    </div>
    <p class="save-state" id="state" aria-live="polite"></p>
    <div class="section">
      <h2>피할 것</h2>
      <ul class="avoid" id="avoid"></ul>
    </div>
    <div class="section" id="timer-slot">
      <h2>3분 낭독</h2>
      <p class="note">소리 내어 읽으며 길이를 맞춰 보세요.</p>
    </div>
    <div class="section stack">
      <p class="quote" id="submit"></p>
      <p class="note" id="submit-note"></p>
      <p class="submit-state" id="submit-state" aria-live="polite"></p>
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
const nameInput = $<HTMLInputElement>('#name');
nameInput.value = data.name;
const persist = debounce(() => {
  data.name = nameInput.value;
  data.answers = boxes.map((b) => b.value);
  save(KEY, data);
  $('#state').textContent = '이 폰에 저장됨';
}, 500);
boxes.forEach((b) => b.addEventListener('input', persist));
nameInput.addEventListener('input', persist);

$('#timer-slot').append(createTimer({ seconds: 180, startText: '낭독 시작' }));

function compose(): string {
  const parts = t2.questions.map((q, i) => `${i + 1}. ${q}\n${boxes[i].value.trim()}`);
  return `3분 간증문\n\n${parts.join('\n\n')}`;
}

/* 하단 버튼 */
const bar = $('#bar');
const copyBtn = h('button', { class: 'btn', type: 'button', text: '복사하기' });
const submitBtn = h('button', { class: 'btn btn-primary', type: 'button', text: '제출하기' });
copyBtn.addEventListener('click', async () => {
  toast((await copyText(compose())) ? '복사했어요' : '복사가 안 됐어요. 글을 길게 눌러 직접 복사해 주세요.');
});

/* 제출 (11/9까지, 서버가 연결되어 있을 때만) */
const canSubmit = () => serverReady() && isOpen();
function renderSubmitState(): void {
  const note = $('#submit-note');
  const state = $('#submit-state');
  if (!serverReady()) note.textContent = '';
  else if (!isOpen()) note.textContent = '제출 기간이 끝났습니다.';
  else note.textContent = '[제출하기]를 누르면 이름과 간증문이 간사님의 Google 시트에 저장됩니다. 다시 제출하면 새로 하나 더 저장됩니다.';
  state.textContent = data.submittedAt ? `제출했어요 · ${new Date(data.submittedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : '';
}
submitBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  const answers = boxes.map((b) => b.value.trim());
  if (!name || answers.every((a) => !a)) {
    toast(errorText('empty'));
    (name ? boxes[0] : nameInput).focus();
    return;
  }
  if (!window.confirm(`${name} 이름으로 간증문을 제출할까요?`)) return;
  submitBtn.disabled = true;
  submitBtn.textContent = '보내는 중…';
  const res = await submitTestimony(name, answers);
  submitBtn.disabled = false;
  submitBtn.textContent = '제출하기';
  if (res.ok) {
    data.submittedAt = new Date().toISOString();
    save(KEY, data);
    toast('제출했어요');
  } else {
    toast(errorText(res.error));
  }
  renderSubmitState();
});
renderSubmitState();
const goTask2 = h('button', { class: 'btn btn-primary', type: 'button', text: '② 3분 간증문 쓰기' });
goTask2.addEventListener('click', () => select(2));

function select(n: 1 | 2): void {
  for (const i of [1, 2]) {
    $(`#tab-${i}`).setAttribute('aria-selected', String(i === n));
    $(`#panel-${i}`).hidden = i !== n;
  }
  bar.replaceChildren(...(n === 1 ? [goTask2] : canSubmit() ? [copyBtn, submitBtn] : [copyBtn]));
  save('homework-tab', n);
}
$('#tab-1').addEventListener('click', () => select(1));
$('#tab-2').addEventListener('click', () => {
  select(2);
});
select(load<number>('homework-tab', 1) === 2 ? 2 : 1);

$('#clear').addEventListener('click', () => {
  if (!window.confirm('체크와 간증문을 이 폰에서 지울까요? (이미 제출한 것은 지워지지 않습니다)')) return;
  remove(KEY);
  data.read = false;
  data.name = '';
  data.answers = ['', '', ''];
  delete data.submittedAt;
  read.checked = false;
  nameInput.value = '';
  renderSubmitState();
  boxes.forEach((b) => (b.value = ''));
  $('#state').textContent = '';
  toast('지웠어요');
});
