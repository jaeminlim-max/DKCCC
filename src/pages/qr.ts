// 간사용 QR 모음 — 인쇄용 레이아웃 + 슬라이드용 PNG(1080×1080) 일괄 내려받기.
import { initPage } from '../lib/page';
import { $, h } from '../lib/dom';
import { ensureFont, font, makeCanvas } from '../lib/canvas-text';
import { makeZip } from '../lib/zip';
import qr from '../generated/qr.json';
import '../styles/qr.css';

initPage();

interface QrPage {
  path: string;
  title: string;
  url: string;
  short: string;
  size: number;
  bits: string;
}
const pages = qr.pages as QrPage[];

function drawQr(ctx: CanvasRenderingContext2D, p: QrPage, x: number, y: number, px: number): void {
  const cell = px / p.size;
  ctx.fillStyle = '#111A2E';
  for (let r = 0; r < p.size; r++)
    for (let c = 0; c < p.size; c++)
      if (p.bits[r * p.size + c] === '1') ctx.fillRect(Math.floor(x + c * cell), Math.floor(y + r * cell), Math.ceil(cell), Math.ceil(cell));
}

/** 슬라이드용: 1080×1080, 흰 바탕, 여백(조용한 구역) 포함, 아래에 제목과 짧은 주소 */
function slideCanvas(p: QrPage): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(1080, 1080);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 1080, 1080);
  const qrPx = 700;
  drawQr(ctx, p, (1080 - qrPx) / 2, 110, qrPx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#111A2E';
  ctx.font = font(800, 54);
  ctx.fillText(p.title, 540, 920);
  ctx.font = font(600, 34);
  ctx.fillStyle = '#2F5BD3';
  ctx.fillText(p.short, 540, 980);
  return c;
}

const app = $('#app');
app.innerHTML = `
  <div class="page-head no-print">
    <h1>QR 모음</h1>
    <p class="where">간사용 · 인쇄하거나 슬라이드에 넣으세요</p>
  </div>
  <p class="note no-print" id="site"></p>
  <div class="stack no-print section qr-actions">
    <button type="button" class="btn btn-primary" id="zip">PNG 모두 내려받기 (ZIP)</button>
    <button type="button" class="btn" id="print">인쇄</button>
  </div>
  <ol class="qr-grid" id="grid"></ol>
`;
$('#site').textContent = `기준 주소: ${qr.site}` + (qr.site.includes('localhost') ? ' — 배포 주소가 정해지면 다시 빌드해야 합니다.' : '');

const fileName = (p: QrPage, i: number) => `${String(i).padStart(2, '0')}-${p.path.replace(/\/$/, '') || 'home'}.png`;

void (async () => {
  await ensureFont(pages.map((p) => p.title + p.short), [600, 800]);
  pages.forEach((p, i) => {
    const slide = slideCanvas(p);
    const img = h('img', { src: slide.toDataURL('image/png'), alt: `${p.title} QR 코드`, width: '1080', height: '1080' });
    const dl = h('a', { class: 'btn btn-quiet no-print', href: img.src, download: fileName(p, i), text: 'PNG' });
    $('#grid').append(h('li', { class: 'qr-item' + (i === 0 ? ' is-home' : '') }, img, h('div', { class: 'qr-meta' }, h('b', { text: p.title }), h('span', { text: p.short })), dl));
  });
})();

$('#print').addEventListener('click', () => window.print());
$('#zip').addEventListener('click', async () => {
  const files = await Promise.all(
    pages.map(async (p, i) => {
      const blob = await new Promise<Blob>((res) => slideCanvas(p).toBlob((b) => res(b!), 'image/png'));
      return { name: fileName(p, i), data: new Uint8Array(await blob.arrayBuffer()) };
    }),
  );
  const url = URL.createObjectURL(makeZip(files));
  const a = h('a', { href: url, download: 'ltc-qr.zip' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
});
