// 기도 명단 카드 — 강의 4 5단계. 이름은 이 폰에만 저장하고, 결단 카드에서 불러온다.
import { initPage } from '../lib/page';
import { $, h, toast } from '../lib/dom';
import { load, remove, save, warnIfNoStorage } from '../lib/storage';
import { createTimer } from '../lib/timer';
import { createNameList } from '../lib/names';
import { openImageSheet } from '../lib/image-save';
import { drawWrapped, ensureFont, font, makeCanvas, wrap } from '../lib/canvas-text';
import QRCode from 'qrcode';
import { encodeNames } from '../lib/prayer-qr';
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
  <p class="note" id="keep-image"></p>
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
$('#keep-image').textContent = PRAYER.keepImage;

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
  await ensureFont([PRAYER.title, PRAYER.instruction, VERSE_2PE_3_9.text, VERSE_2PE_3_9.ref, ...names], [500, 600, 700, 800]);
  const W = 1080;
  const m = 96;
  const ink = '#2B2118';
  const soft = '#6E5B49';
  const accent = '#B4652A';

  // 높이를 먼저 계산한다: 제목·안내 / 이름 / 구절
  const [probe, pctx] = makeCanvas(10, 10);
  void probe;
  pctx.font = font(500, 32);
  const verseLines = wrap(pctx, VERSE_2PE_3_9.text, W - m * 2).length;
  const cols = names.length > 20 ? 3 : names.length > 9 ? 2 : 1;
  const rows = Math.ceil(names.length / cols);
  const nameSize = cols === 1 ? 54 : cols === 2 ? 46 : 38;
  const lineH = Math.round(nameSize * 1.75);
  const headH = 420;
  const namesH = Math.max(rows * lineH, 240);
  const verseH = 70 + verseLines * 50 + 64;
  const H = Math.max(1350, headH + namesH + verseH + 110);

  const [c, ctx] = makeCanvas(W, H);
  // 따뜻한 배경 (위는 크림, 아래로 갈수록 살구빛)
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#FCF5EA');
  bg.addColorStop(1, '#F5E2CB');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 제목과 안내
  ctx.fillStyle = ink;
  ctx.font = font(800, 76);
  ctx.fillText(PRAYER.title, m, 200);
  ctx.font = font(500, 32);
  ctx.fillStyle = soft;
  drawWrapped(ctx, PRAYER.instruction, m, 268, W - m * 2 - 250, 48);

  // 다시 불러오기용 QR (오른쪽 위, 작게)
  const QRS = 208;
  drawQr(ctx, encodeNames(names), W - m - QRS, 96, QRS);

  // 이름
  const top = headH;
  ctx.strokeStyle = 'rgba(110, 91, 73, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(m, top - 36);
  ctx.lineTo(W - m, top - 36);
  ctx.stroke();
  ctx.font = font(700, nameSize);
  ctx.fillStyle = ink;
  const colW = (W - m * 2) / cols;
  names.forEach((n, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const x = m + col * colW;
    const yy = top + row * lineH + nameSize;
    let label = n;
    while (ctx.measureText(label).width > colW - 24 && label.length > 1) label = label.slice(0, -1);
    ctx.fillText(label === n ? n : label + '…', x, yy);
  });

  // 하단: 베드로후서 3:9
  let y = H - verseH - 40;
  ctx.beginPath();
  ctx.moveTo(m, y);
  ctx.lineTo(W - m, y);
  ctx.stroke();
  y += 70;
  ctx.font = font(500, 32);
  ctx.fillStyle = soft;
  y = drawWrapped(ctx, VERSE_2PE_3_9.text, m, y, W - m * 2, 50);
  ctx.font = font(700, 28);
  ctx.fillStyle = accent;
  ctx.fillText(VERSE_2PE_3_9.ref, m, y + 18);

  void openImageSheet(c, 'ltc-기도명단.png', '기도 명단 카드');
});

/** 흰 바탕 위에 QR을 그린다 (바깥 여백 포함). */
function drawQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number): void {
  const qr = QRCode.create(text, { errorCorrectionLevel: text.length > 60 ? 'L' : 'M' });
  const n = qr.modules.size;
  const pad = 12;
  ctx.fillStyle = '#FFFFFF';
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 14);
    ctx.fill();
  } else ctx.fillRect(x, y, size, size);
  const cell = (size - pad * 2) / n;
  ctx.fillStyle = '#2B2118';
  for (let r = 0; r < n; r++)
    for (let col = 0; col < n; col++)
      if (qr.modules.get(r, col)) ctx.fillRect(x + pad + col * cell, y + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
}
