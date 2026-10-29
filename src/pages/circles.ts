// 세 원 그리기 — 손가락 그리기 캔버스. 자동 저장 없음, PNG 내려받기만.
import { initPage } from '../lib/page';
import { $, h } from '../lib/dom';
import { createTimer } from '../lib/timer';
import { openImageSheet } from '../lib/image-save';
import { makeCanvas } from '../lib/canvas-text';
import { CIRCLES } from '../content';

initPage();

type Pt = [number, number];
interface Stroke {
  erase: boolean;
  pts: Pt[]; // 0~1로 정규화한 좌표
}

const app = $('#app');
app.innerHTML = `
  <div class="page-head">
    <h1>${CIRCLES.title}</h1>
    <p class="where">${CIRCLES.where}</p>
  </div>
  <p class="lead" id="guide"></p>
  <div class="section">
    <div class="tool-row" role="toolbar" aria-label="그리기 도구">
      <button type="button" class="btn" data-tool="pen" aria-pressed="true">펜</button>
      <button type="button" class="btn" data-tool="erase" aria-pressed="false">지우개</button>
      <button type="button" class="btn" id="undo">되돌리기</button>
      <button type="button" class="btn btn-danger" id="clear">전체 지우기</button>
    </div>
    <div class="draw-paper">
      <canvas id="pad" aria-label="그림 그리는 곳. 손가락으로 그리세요."></canvas>
      <p class="draw-empty" id="empty">여기에 손가락으로 세 원을 그려 보세요</p>
    </div>
  </div>
  <div class="section" id="timer-slot"><h2>짝에게 설명하기</h2><p class="note">이면지에 그렸다면 이 타이머만 써도 됩니다.</p></div>
  <div class="section">
    <details class="more">
      <summary>세 종류의 사람 (고전 2:14~3:3)</summary>
      <ul class="ref-list" id="kinds"></ul>
    </details>
  </div>
  <div class="bottom-bar"><div class="inner">
    <button type="button" class="btn btn-primary" id="save" disabled>그림 내려받기 (PNG)</button>
  </div></div>
`;
$('#guide').textContent = CIRCLES.guide;
for (const k of CIRCLES.kinds) {
  $('#kinds').append(h('li', {}, h('span', {}, h('b', { text: k.name }), h('small', { text: k.sub })), h('cite', { text: k.ref })));
}

$('#timer-slot').append(
  createTimer({
    seconds: 90,
    rounds: 2,
    roundLabel: (r) => (r === 1 ? '첫 번째 사람' : '두 번째 사람'),
    startText: '설명 시작',
  }),
);

/* ── 그리기 ── */
const pad = $<HTMLCanvasElement>('#pad');
const ctx = pad.getContext('2d')!;
const strokes: Stroke[] = [];
let current: Stroke | null = null;
let tool: 'pen' | 'erase' = 'pen';

const inkColor = () => getComputedStyle(document.body).color;

function resize(): void {
  const r = pad.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  pad.width = Math.round(r.width * dpr);
  pad.height = Math.round(r.height * dpr);
  redraw();
}

function drawStroke(c: CanvasRenderingContext2D, s: Stroke, w: number, hgt: number, color: string): void {
  c.save();
  c.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
  c.strokeStyle = color;
  c.lineWidth = (s.erase ? 0.06 : 0.011) * w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  s.pts.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * hgt) : c.moveTo(x * w, y * hgt)));
  if (s.pts.length === 1) c.lineTo(s.pts[0][0] * w + 0.1, s.pts[0][1] * hgt);
  c.stroke();
  c.restore();
}

function redraw(): void {
  ctx.clearRect(0, 0, pad.width, pad.height);
  const color = inkColor();
  for (const s of strokes) drawStroke(ctx, s, pad.width, pad.height, color);
  const hasInk = strokes.some((s) => !s.erase);
  $('#empty').hidden = hasInk;
  $<HTMLButtonElement>('#save').disabled = !hasInk;
}

function point(e: PointerEvent): Pt {
  const r = pad.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
}

pad.addEventListener('pointerdown', (e) => {
  pad.setPointerCapture(e.pointerId);
  current = { erase: tool === 'erase', pts: [point(e)] };
  strokes.push(current);
  redraw();
});
pad.addEventListener('pointermove', (e) => {
  if (!current) return;
  const events = e.getCoalescedEvents?.() ?? [e];
  for (const ev of events) current.pts.push(point(ev));
  redraw();
});
const end = () => {
  current = null;
};
pad.addEventListener('pointerup', end);
pad.addEventListener('pointercancel', end);

document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) =>
  b.addEventListener('click', () => {
    tool = b.dataset.tool as 'pen' | 'erase';
    document.querySelectorAll('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }),
);
$('#undo').addEventListener('click', () => {
  strokes.pop();
  redraw();
});
$('#clear').addEventListener('click', () => {
  if (!strokes.length || !window.confirm('그림을 모두 지울까요?')) return;
  strokes.length = 0;
  redraw();
});

// 테마가 바뀌면 선 색을 다시 맞춘다
new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
new ResizeObserver(resize).observe(pad);

$('#save').addEventListener('click', () => {
  // 내려받는 그림은 화면 테마와 상관없이 밝은 종이에 남색 선
  const [out, o] = makeCanvas(1080, 1080);
  o.fillStyle = '#FFFDF6';
  o.fillRect(0, 0, out.width, out.height);
  const [layer, l] = makeCanvas(1080, 1080);
  for (const s of strokes) drawStroke(l, s, layer.width, layer.height, '#111A2E');
  o.drawImage(layer, 0, 0);
  void openImageSheet(out, 'ltc-세원그리기.png', '세 원 그림');
});
