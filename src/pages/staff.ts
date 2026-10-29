// 간사용 — 간증문 조회(암호는 Google 서버가 확인) + QR 모음(인쇄용, 슬라이드용 PNG 1080×1080 일괄 내려받기).
import { initPage } from '../lib/page';
import { $, h, toast } from '../lib/dom';
import { HOMEWORK } from '../content';
import { ensureFont, font, makeCanvas } from '../lib/canvas-text';
import { makeZip } from '../lib/zip';
import qr from '../generated/qr.json';
import '../styles/staff.css';
import { errorText, listTestimonies, serverReady, type Submission } from '../lib/api';
import { copyText } from '../lib/share';

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
const fileName = (p: QrPage, i: number) => `${String(i).padStart(2, '0')}-${p.path.replace(/\/$/, '') || 'home'}.png`;

if (serverReady()) renderGate();
else renderStaff(null, '제출 서버가 아직 연결되지 않아 잠금 없이 QR만 보여 줍니다.');

/* 암호: 서버가 확인한다. 암호는 이 화면의 메모리에만 두고 저장하지 않는다. */
function renderGate(): void {
  const input = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'off', id: 'pw', 'aria-describedby': 'pw-msg' });
  const msg = h('p', { class: 'note', id: 'pw-msg', 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn btn-primary', type: 'submit', text: '열기' });
  const form = h(
    'form',
    { class: 'stack gate' },
    h('div', { class: 'page-head' }, h('h1', { text: '간사용 페이지' }), h('p', { class: 'where', text: '암호를 입력하세요' })),
    h('label', { class: 'field', for: 'pw' }, h('span', { text: '암호' }), input),
    msg,
    btn,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    msg.textContent = '확인하는 중…';
    const res = await listTestimonies(input.value.trim());
    btn.disabled = false;
    if (res.ok) {
      renderStaff({ password: input.value.trim(), rows: res.rows });
    } else {
      msg.textContent = errorText(res.error);
      input.value = '';
      input.focus();
    }
  });
  app.replaceChildren(form);
  input.focus();
}

function renderStaff(auth: { password: string; rows: Submission[] } | null, notice = ''): void {
  app.innerHTML = `
    <div class="page-head no-print">
      <h1>간사용 페이지</h1>
      <p class="where">간증문 · QR 모음</p>
    </div>
    <div class="segment no-print" role="tablist" aria-label="간사용">
      <button type="button" role="tab" id="tab-t" aria-controls="panel-t">간증문</button>
      <button type="button" role="tab" id="tab-q" aria-controls="panel-q">QR 모음</button>
    </div>
    <section id="panel-t" role="tabpanel" aria-labelledby="tab-t"></section>
    <section id="panel-q" role="tabpanel" aria-labelledby="tab-q" hidden></section>
  `;
  const select = (t: 't' | 'q') => {
    for (const k of ['t', 'q'] as const) {
      $(`#tab-${k}`).setAttribute('aria-selected', String(k === t));
      $(`#panel-${k}`).hidden = k !== t;
    }
  };
  $('#tab-t').addEventListener('click', () => select('t'));
  $('#tab-q').addEventListener('click', () => select('q'));
  renderQr($('#panel-q'));
  if (auth) {
    renderTestimonies($('#panel-t'), auth.password, auth.rows);
    select('t');
  } else {
    $('#panel-t').append(h('p', { class: 'note section', text: notice }));
    select('q');
  }
}

/* 간증문 목록 */
function renderTestimonies(panel: HTMLElement, password: string, rows: Submission[]): void {
  const draw = (list: Submission[]) => {
    const sorted = [...list].sort((a, b) => b.at.localeCompare(a.at));
    const latestByName = new Map<string, string>();
    for (const r of sorted) if (!latestByName.has(r.name)) latestByName.set(r.name, r.at);
    const when = (iso: string) => new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const items = sorted.map((r) => {
      const old = latestByName.get(r.name) !== r.at;
      const body = h('div', { class: 'tbody' }, ...HOMEWORK.task2.questions.map((q, i) => h('div', { class: 'tqa' }, h('p', { class: 'tq-q', text: `${i + 1}. ${q}` }), h('p', { class: 'tq-a', text: r.answers[i] || '—' }))));
      const copy = h('button', { class: 'btn btn-quiet', type: 'button', text: '이 간증문 복사' });
      copy.addEventListener('click', async () => {
        const text = `${r.name} · ${when(r.at)}\n\n` + HOMEWORK.task2.questions.map((q, i) => `${i + 1}. ${q}\n${r.answers[i] ?? ''}`).join('\n\n');
        toast((await copyText(text)) ? '복사했어요' : '복사가 안 됐어요');
      });
      body.append(copy);
      return h(
        'details',
        { class: 'titem' + (old ? ' is-old' : '') },
        h('summary', {}, h('b', { text: r.name }), h('span', { text: when(r.at) + (old ? ' · 이전 제출' : '') })),
        body,
      );
    });
    const refresh = h('button', { class: 'btn', type: 'button', text: '새로고침' });
    refresh.addEventListener('click', async () => {
      refresh.disabled = true;
      const res = await listTestimonies(password);
      refresh.disabled = false;
      if (res.ok) draw(res.rows);
      else toast(errorText(res.error));
    });
    panel.replaceChildren(
      h('p', { class: 'section count', text: `제출 ${sorted.length}건 · ${latestByName.size}명` }),
      ...(items.length ? items : [h('p', { class: 'note section', text: '아직 제출된 간증문이 없습니다.' })]),
      h('div', { class: 'section' }, refresh),
      h('p', { class: 'note section', text: '원본은 간사님 Google 시트에 있습니다. 이 화면은 저장되지 않으며, 다시 열면 암호를 다시 묻습니다.' }),
    );
  };
  draw(rows);
}

/* QR 모음 */
function renderQr(panel: HTMLElement): void {
  panel.innerHTML = `
    <p class="note no-print section" id="site"></p>
    <div class="stack no-print section qr-actions">
      <button type="button" class="btn btn-primary" id="zip">PNG 모두 내려받기 (ZIP)</button>
      <button type="button" class="btn" id="print">인쇄</button>
    </div>
    <ol class="qr-grid" id="grid"></ol>
  `;
  $('#site').textContent = `기준 주소: ${qr.site}` + (qr.site.includes('localhost') ? ' — 배포 주소가 정해지면 다시 빌드해야 합니다.' : '');
  void (async () => {
    await ensureFont(pages.map((p) => p.title + p.short), [600, 800]);
    pages.forEach((p, i) => {
      const slide = slideCanvas(p);
      const img = h('img', { src: slide.toDataURL('image/png'), alt: `${p.title} QR 코드`, width: '1080', height: '1080' });
      const dl = h('a', { class: 'btn btn-quiet no-print', href: img.src, download: fileName(p, i), text: 'PNG' });
      $('#grid').append(h('li', { class: 'qr-item' + (i === 0 ? ' is-home' : '') }, img, dl));
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
}
