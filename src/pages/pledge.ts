// 결단 카드 — 강의 5 6번 (5)(6). 두 칸 + 헌신 기도(한 문장씩). 이 폰에만 저장.
import { initPage } from '../lib/page';
import { $, h, toast } from '../lib/dom';
import { load, remove, save, warnIfNoStorage } from '../lib/storage';
import { createNameList } from '../lib/names';
import { openImageSheet } from '../lib/image-save';
import { drawWrapped, ensureFont, font, makeCanvas, wrap } from '../lib/canvas-text';
import { PLEDGE } from '../content';
import { KEYS } from '../keys';

initPage();

interface Data {
  evangelize: string[];
  grow: string;
}
const data = load<Data>(KEYS.pledge, { evangelize: [], grow: '' });
if (!Array.isArray(data.evangelize)) data.evangelize = [];
if (typeof data.grow !== 'string') data.grow = '';
const persist = () => save(KEYS.pledge, data);

const app = $('#app');
app.innerHTML = `
  <div class="page-head">
    <h1>${PLEDGE.title}</h1>
    <p class="where">${PLEDGE.where}</p>
  </div>
  <section class="box" id="box1" aria-labelledby="b1">
    <h2 id="b1"><span class="box-no">1</span>${PLEDGE.box1.name}</h2>
    <p class="hint-line">${PLEDGE.box1.hint}</p>
    <button type="button" class="btn import" id="import">기도 명단에서 불러오기</button>
    <div class="chips" id="chips" hidden></div>
  </section>
  <section class="box" id="box2" aria-labelledby="b2">
    <h2 id="b2"><span class="box-no">2</span>${PLEDGE.box2.name}</h2>
    <p class="hint-line">${PLEDGE.box2.hint}</p>
    <input type="text" id="grow" maxlength="30" autocomplete="off" aria-label="${PLEDGE.box2.name}">
    <button type="button" class="btn" id="fill">“${PLEDGE.box2.fill}”</button>
  </section>

  <section class="section" aria-labelledby="pt">
    <h2 id="pt">헌신 기도</h2>
    <p class="note">한 문장씩 따라 하세요.</p>
    <div class="slides section">
      <p class="slide-text" id="slide" aria-live="polite"></p>
      <div class="slide-dots" id="dots" aria-hidden="true"></div>
      <div class="btn-row">
        <button type="button" class="btn" id="prev">이전</button>
        <button type="button" class="btn btn-primary" id="next">다음</button>
      </div>
    </div>
  </section>

  <p class="section keep" id="carry"></p>
  <div class="section">
    <button type="button" class="btn btn-quiet btn-danger" id="clear">이 폰에서 지우기</button>
  </div>
  <div class="bottom-bar"><div class="inner">
    <button type="button" class="btn btn-primary" id="save">카드 이미지 저장</button>
  </div></div>
`;
$('#carry').textContent = PLEDGE.carry;
warnIfNoStorage($('#box1'));

/* 칸 1 — 전도할 사람 */
const list = createNameList({
  names: data.evangelize,
  label: PLEDGE.box1.name,
  placeholder: '새로 입력',
  onChange: (names) => {
    data.evangelize = names;
    persist();
    renderChips();
  },
});
$('#import').after(list.root);

const chips = $('#chips');
function renderChips(): void {
  if (chips.hidden) return;
  const saved = load<{ names: string[] }>(KEYS.prayerList, { names: [] }).names ?? [];
  if (!saved.length) {
    chips.replaceChildren(h('p', { class: 'note', text: '이 폰에 저장된 기도 명단이 없어요. 아래에 새로 적어 주세요.' }));
    return;
  }
  chips.replaceChildren(
    h('p', { class: 'note', text: '누르면 위 칸에 들어갑니다.' }),
    ...saved.map((n) => {
      const on = data.evangelize.includes(n);
      const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), text: (on ? '✓ ' : '+ ') + n });
      b.addEventListener('click', () => {
        if (data.evangelize.includes(n)) data.evangelize = data.evangelize.filter((x) => x !== n);
        else data.evangelize.push(n);
        list.set(data.evangelize);
        persist();
        renderChips();
      });
      return b;
    }),
  );
}
$('#import').addEventListener('click', () => {
  chips.hidden = !chips.hidden;
  renderChips();
});

/* 칸 2 — 함께 자랄 한 사람 */
const grow = $<HTMLInputElement>('#grow');
grow.value = data.grow;
grow.addEventListener('input', () => {
  data.grow = grow.value;
  persist();
});
$('#fill').addEventListener('click', () => {
  grow.value = PLEDGE.box2.fill;
  data.grow = grow.value;
  persist();
});

/* 헌신 기도 — 한 문장씩 */
let idx = 0;
const slide = $('#slide');
const dots = $('#dots');
PLEDGE.prayer.forEach(() => dots.append(h('i')));
function show(i: number): void {
  idx = Math.max(0, Math.min(PLEDGE.prayer.length - 1, i));
  slide.textContent = PLEDGE.prayer[idx];
  slide.classList.remove('is-entering');
  void slide.offsetWidth;
  slide.classList.add('is-entering');
  dots.querySelectorAll('i').forEach((d, j) => d.classList.toggle('on', j === idx));
  $<HTMLButtonElement>('#prev').disabled = idx === 0;
  $<HTMLButtonElement>('#next').textContent = idx === PLEDGE.prayer.length - 1 ? '처음으로' : '다음';
}
$('#prev').addEventListener('click', () => show(idx - 1));
$('#next').addEventListener('click', () => show(idx === PLEDGE.prayer.length - 1 ? 0 : idx + 1));
show(0);

$('#clear').addEventListener('click', () => {
  if (!window.confirm('결단 카드 내용을 이 폰에서 지울까요?')) return;
  remove(KEYS.pledge);
  data.evangelize = [];
  data.grow = '';
  list.set([]);
  grow.value = '';
  renderChips();
  toast('지웠어요');
});

/* 카드 이미지 */
$('#save').addEventListener('click', async () => {
  const names = data.evangelize;
  const growText = data.grow.trim();
  await ensureFont([PLEDGE.title, PLEDGE.box1.name, PLEDGE.box2.name, PLEDGE.carry, growText, ...names], [500, 700, 800]);
  const W = 1080;
  const H = 1350;
  const m = 96;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#111A2E';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#F28C38';
  ctx.fillRect(m, 120, 80, 10);
  ctx.fillStyle = '#F6F3EC';
  ctx.font = font(800, 76);
  ctx.fillText(PLEDGE.title, m, 230);

  const section = (label: string, y: number) => {
    ctx.font = font(700, 34);
    ctx.fillStyle = '#9FB5F8';
    ctx.fillText(label, m, y);
    return y + 30;
  };

  let y = section('1  ' + PLEDGE.box1.name, 350);
  ctx.font = font(700, 50);
  ctx.fillStyle = '#F6F3EC';
  const joined = names.length ? names.join(',  ') : ' ';
  const lines = wrap(ctx, joined, W - m * 2).slice(0, 6);
  lines.forEach((l) => {
    y += 72;
    ctx.fillText(l, m, y);
  });

  y = Math.max(y + 110, 720);
  y = section('2  ' + PLEDGE.box2.name, y);
  ctx.font = font(700, 50);
  ctx.fillStyle = '#F6F3EC';
  y = drawWrapped(ctx, growText || ' ', m, y + 72, W - m * 2, 72);

  ctx.font = font(500, 32);
  ctx.fillStyle = '#B9C3DA';
  drawWrapped(ctx, PLEDGE.carry, m, H - 150, W - m * 2, 46);
  ctx.font = font(500, 28);
  ctx.fillText('LTC 초급 2026.11.03', m, H - 70);
  void openImageSheet(c, 'ltc-결단카드.png', '결단 카드');
});
