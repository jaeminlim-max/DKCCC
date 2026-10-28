// 기도 명단 카드 — 강의 4 5단계. 이름은 이 폰에만 저장하고, 결단 카드에서 불러온다.
import { initPage } from '../lib/page';
import { $, h, toast } from '../lib/dom';
import { load, remove, save, warnIfNoStorage } from '../lib/storage';
import { createTimer } from '../lib/timer';
import { createNameList } from '../lib/names';
import { openImageSheet } from '../lib/image-save';
import { drawWrapped, ensureFont, font, makeCanvas } from '../lib/canvas-text';
import { PRAYER, VERSE_2PE_3_9 } from '../content';
import { KEYS } from '../keys';

initPage();

const PRAYER_KEY = KEYS.prayerList;
const data = load<{ names: string[] }>(PRAYER_KEY, { names: [] });
if (!Array.isArray(data.names)) data.names = [];

const app = $('#app');
app.innerHTML = `
  <div class="page-head">
    <h1>${PRAYER.title}</h1>
    <p class="where">${PRAYER.where}</p>
  </div>
  <blockquote class="verse"><p id="verse"></p><cite id="ref"></cite></blockquote>
  <p class="section lead strong" id="instruction"></p>
  <div class="section" id="timer-slot"></div>
  <div class="section" id="names-slot">
    <h2 id="names-title">이름 적기</h2>
  </div>
  <p class="section keep" id="keep"></p>
  <div class="section">
    <button type="button" class="btn btn-quiet btn-danger" id="clear">이 폰에서 지우기</button>
  </div>
  <div class="bottom-bar"><div class="inner">
    <button type="button" class="btn btn-primary" id="save">카드 이미지 저장</button>
  </div></div>
`;
$('#verse').textContent = VERSE_2PE_3_9.text;
$('#ref').textContent = VERSE_2PE_3_9.ref;
$('#instruction').textContent = PRAYER.instruction;
$('#keep').textContent = PRAYER.keep;

const list = createNameList({
  names: data.names,
  label: '기도할 사람 이름',
  onChange: (names) => {
    data.names = names;
    save(PRAYER_KEY, data);
    updateSave();
  },
});
$('#names-slot').append(list.root);
warnIfNoStorage($('#names-slot'));

$('#timer-slot').append(
  createTimer({
    seconds: 30,
    label: '30초 눈 감기',
    startText: '눈 감기 시작',
    onEnd: () => {
      $('#names-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  }),
);

const saveBtn = $<HTMLButtonElement>('#save');
const updateSave = () => (saveBtn.disabled = data.names.length === 0);
updateSave();

$('#clear').addEventListener('click', () => {
  if (!window.confirm('기도 명단을 이 폰에서 지울까요? 결단 카드에서도 불러올 수 없게 됩니다.')) return;
  remove(PRAYER_KEY);
  data.names = [];
  list.set([]);
  updateSave();
  toast('지웠어요');
});

saveBtn.addEventListener('click', async () => {
  const names = data.names;
  await ensureFont([PRAYER.title, PRAYER.instruction, VERSE_2PE_3_9.ref, ...names], [500, 700, 800]);
  const W = 1080;
  const H = 1350;
  const [c, ctx] = makeCanvas(W, H);
  const m = 96;
  ctx.fillStyle = '#F6F3EC';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#F28C38';
  ctx.fillRect(m, 120, 80, 10);
  ctx.fillStyle = '#111A2E';
  ctx.font = font(800, 76);
  ctx.fillText(PRAYER.title, m, 230);
  ctx.font = font(500, 34);
  ctx.fillStyle = '#4B556B';
  let y = drawWrapped(ctx, PRAYER.instruction, m, 300, W - m * 2, 50);

  // 이름: 많으면 여러 줄로 나눈다
  const cols = names.length > 20 ? 3 : names.length > 9 ? 2 : 1;
  const rows = Math.ceil(names.length / cols);
  const top = y + 60;
  const bottom = H - 190;
  const lineH = Math.min(96, (bottom - top) / Math.max(rows, 1));
  const size = Math.min(cols === 1 ? 58 : cols === 2 ? 48 : 38, lineH * 0.62);
  ctx.font = font(700, size);
  ctx.fillStyle = '#111A2E';
  const colW = (W - m * 2) / cols;
  names.forEach((n, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const x = m + col * colW;
    const yy = top + row * lineH + size;
    ctx.fillStyle = '#2F5BD3';
    ctx.fillRect(x, yy - size * 0.42, 12, 12);
    ctx.fillStyle = '#111A2E';
    let label = n;
    while (ctx.measureText(label).width > colW - 48 && label.length > 1) label = label.slice(0, -1);
    ctx.fillText(label === n ? n : label + '…', x + 32, yy);
  });

  ctx.fillStyle = '#4B556B';
  ctx.font = font(500, 30);
  ctx.fillText(`${VERSE_2PE_3_9.ref}  ·  LTC 초급 2026.11.03`, m, H - 100);
  void openImageSheet(c, 'ltc-기도명단.png', '기도 명단 카드');
});
