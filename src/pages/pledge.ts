// 결단 카드 — 강의 5 6번 (5)(6). 두 칸 + 헌신 기도(한 문장씩). 이 폰에만 저장.
import { initPage } from '../lib/page';
import { $, h, toast } from '../lib/dom';
import { load, remove, save, warnIfNoStorage } from '../lib/storage';
import { createNameList } from '../lib/names';
import { openImageSheet } from '../lib/image-save';
import { drawWrapped, ensureFont, font, makeCanvas, wrap } from '../lib/canvas-text';
import { PLEDGE } from '../content';
import { KEYS } from '../keys';
import jsQR from 'jsqr';
import { decodeNames } from '../lib/prayer-qr';

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
  const upload = uploadControl();
  if (!saved.length) {
    chips.replaceChildren(
      h('p', { class: 'note', text: '이 폰에 저장된 기도 명단이 없어요. 기도 명단 카드 이미지를 저장해 두었다면 올려 주세요. 없으면 아래에 새로 적어 주세요.' }),
      upload,
    );
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
    upload,
  );
}

/* 저장한 기도 명단 카드 이미지에서 이름 되살리기 — 이미지는 폰 안에서만 읽고 어디로도 보내지 않는다 */
function uploadControl(): HTMLElement {
  const input = h('input', { type: 'file', accept: 'image/*', class: 'visually-hidden', id: 'card-file', 'aria-label': '기도 명단 카드 이미지' });
  const btn = h('label', { class: 'btn upload', for: 'card-file', text: '저장한 카드 이미지 올리기' });
  const msg = h('p', { class: 'note', 'aria-live': 'polite' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    msg.textContent = '이미지를 읽는 중…';
    const names = await readCard(file);
    if (!names) {
      msg.textContent = '이 이미지에서 기도 명단을 찾지 못했어요. 이 사이트에서 저장한 기도 명단 카드 이미지인지 확인해 주세요.';
      return;
    }
    // 되살린 이름은 이 브라우저의 기도 명단에도 저장한다
    const saved = load<{ names: string[] }>(KEYS.prayerList, { names: [] }).names ?? [];
    const merged = [...saved, ...names.filter((n) => !saved.includes(n))];
    save(KEYS.prayerList, { names: merged });
    toast(`카드에서 ${names.length}명을 불러왔어요`);
    renderChips();
  });
  return h('div', { class: 'upload-row' }, input, btn, msg);
}

async function readCard(file: File): Promise<string[] | null> {
  try {
    const bitmap = await createImageBitmap(file);
    // 전체를 먼저 보고, 못 찾으면 QR이 있는 오른쪽 위를 크게 다시 본다
    const tries: [number, number, number, number][] = [
      [0, 0, bitmap.width, bitmap.height],
      [bitmap.width * 0.55, 0, bitmap.width * 0.45, bitmap.height * 0.35],
    ];
    for (const [sx, sy, sw, sh] of tries) {
      const scale = Math.min(1, 1400 / Math.max(sw, sh)) * (sx > 0 ? 2 : 1);
      const w = Math.round(sw * scale);
      const hgt = Math.round(sh * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = hgt;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, hgt);
      const img = ctx.getImageData(0, 0, w, hgt);
      const code = jsQR(img.data, w, hgt, { inversionAttempts: 'dontInvert' });
      canvas.width = 0;
      const names = code ? decodeNames(code.data) : null;
      if (names && names.length) return names;
    }
    bitmap.close();
    return null;
  } catch {
    return null;
  }
}

$('#import').addEventListener('click', () => {
  chips.hidden = !chips.hidden;
  renderChips();
});

/* 칸 2 — 순모임 도전해볼 사람 (한 명, [등록]) */
const grow = createNameList({
  names: data.grow ? [data.grow] : [],
  label: PLEDGE.box2.name,
  addText: '등록',
  max: 1,
  onChange: (names) => {
    data.grow = names[0] ?? '';
    persist();
  },
});
$('#box2').append(grow.root);

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
  grow.set([]);
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
