// 죄 목록 — 강의 1 7번 ❶~❹.
// 이 페이지는 어떤 저장도 하지 않는다: localStorage·sessionStorage·IndexedDB·쿠키를 쓰지 않고,
// 저장 모듈(lib/storage)과 서비스 워커 등록 코드도 가져오지 않는다.
// 페이지를 떠나거나(뒤로가기·새로고침) 앱을 전환하면 입력값과 DOM을 비우고 처음부터 시작한다.
import '../styles/base.css';
import '../styles/confess.css';
import { $, h, prefersReducedMotion } from '../lib/dom';
import { initThemeToggle } from '../lib/theme';
import { chime, unlockAudio, vibrate } from '../lib/feedback';
import { keepScreenOn } from '../lib/wakelock';
import { CONFESS, VERSE_1JN_1_9, VERSE_PS_103_12 } from '../content';

const themeBtn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
if (themeBtn) initThemeToggle(themeBtn); // 저장 없이 이 화면에서만 바뀐다

const app = $('#app');
let darkPaper = false;
let timers: number[] = [];
let cleanupFns: (() => void)[] = [];
let layer: HTMLElement | null = null; // 찢긴 조각을 담는 층
let pieces: HTMLElement[] = [];

const later = (fn: () => void, ms: number) => {
  timers.push(window.setTimeout(fn, ms));
};

/* ── 모두 비우기 ──────────────────────────────────── */
function wipe(): void {
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  cleanupFns.forEach((f) => f());
  cleanupFns = [];
  document.querySelectorAll('textarea').forEach((t) => (t.value = ''));
  document.querySelectorAll('.tear-layer, .dim-layer').forEach((n) => n.remove());
  layer = null;
  pieces = [];
  app.replaceChildren();
  document.body.classList.remove('is-dimming');
  keepScreenOn(false);
}

function restart(): void {
  wipe();
  renderIntro();
}

// 떠날 때·가려질 때 비운다. 돌아오면 빈 종이에서 다시 시작한다.
window.addEventListener('pagehide', wipe);
window.addEventListener('pageshow', (e) => {
  if (e.persisted) restart();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') wipe();
  else if (!app.firstChild) renderIntro();
});
document.addEventListener('freeze', wipe);

function stepHead(mark: string, text: string): HTMLElement {
  return h('div', { class: 'step-head' }, h('span', { class: 'step-mark', 'aria-hidden': 'true', text: mark }), h('p', { class: 'step-text', text }));
}

function bottomBar(...buttons: HTMLElement[]): HTMLElement {
  return h('div', { class: 'bottom-bar' }, h('div', { class: 'inner' }, ...buttons));
}

/* ── 안내 ─────────────────────────────────────────── */
function renderIntro(): void {
  const paperToggle = h('input', { type: 'checkbox', id: 'dark-paper' });
  paperToggle.checked = darkPaper;
  paperToggle.addEventListener('change', () => (darkPaper = paperToggle.checked));

  const start = h('button', { class: 'btn btn-primary', type: 'button', text: '시작하기' });
  start.addEventListener('click', () => {
    unlockAudio();
    keepScreenOn(true);
    renderPray();
  });

  app.replaceChildren(
    h('div', { class: 'page-head' }, h('h1', { text: CONFESS.title }), h('p', { class: 'where', text: CONFESS.where })),
    h('div', { class: 'notice' }, h('p', { class: 'notice-main', text: CONFESS.notice }), h('p', { class: 'note', text: CONFESS.noticeSmall })),
    h(
      'label',
      { class: 'check paper-option', for: 'dark-paper' },
      paperToggle,
      h('span', {}, '어두운 종이로 쓰기', h('small', { text: '옆 사람이 보기 어려워요' })),
    ),
    bottomBar(start),
  );
}

/* ── ❶ 기도 30초 ──────────────────────────────────── */
function renderPray(): void {
  const SECONDS = 30;
  const count = h('div', { class: 'pray-count', role: 'timer', text: String(SECONDS) });
  const dim = h('div', { class: 'dim-layer', 'aria-hidden': 'true' });
  app.replaceChildren(
    stepHead('❶', CONFESS.step1),
    h('div', { class: 'pray' }, count, h('p', { class: 'note', text: '눈을 감고 기도하세요. 30초가 지나면 다음으로 넘어갑니다.' })),
  );
  document.body.append(dim);
  if (!prefersReducedMotion()) document.body.classList.add('is-dimming');

  const endAt = Date.now() + SECONDS * 1000;
  const tick = window.setInterval(() => {
    const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    count.textContent = String(left);
    if (left <= 0) {
      window.clearInterval(tick);
      document.body.classList.remove('is-dimming');
      dim.remove();
      vibrate(120);
      chime();
      renderWrite();
    }
  }, 250);
  cleanupFns.push(() => window.clearInterval(tick));
}

/* ── ❷ 적고 고백하기 ─────────────────────────────── */
function paperCard(): HTMLElement {
  return h('div', { class: 'paper' + (darkPaper ? ' is-dark' : '') });
}

function renderWrite(): void {
  const card = paperCard();
  const ta = h('textarea', {
    'aria-label': '죄 목록',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    'data-gramm': 'false',
    enterkeyhint: 'enter',
    rows: '10',
    placeholder: '이 종이는 저장되지 않습니다.',
  });
  card.append(ta);

  const done = h('button', { class: 'btn btn-primary', type: 'button', text: '작성 완료', disabled: '' });
  ta.addEventListener('input', () => {
    done.disabled = ta.value.trim() === '';
  });
  done.addEventListener('click', () => {
    if (ta.value.trim() === '') return;
    renderCover(card, ta);
  });

  app.replaceChildren(stepHead('❷', CONFESS.step2), card, bottomBar(done));
  ta.focus({ preventScroll: true });
}

/* ── ❸ 흐려지고 요일 1:9이 대각선으로 덮음 ───────── */
// 구절을 줄로 나눈 것 (본문은 그대로)
const VERSE_LINES = ['만일 우리가 우리 죄를 자백하면', '그는 미쁘시고 의로우사', '우리 죄를 사하시며', '우리를 모든 불의에서', '깨끗하게 하실 것이요'];

function renderCover(card: HTMLElement, ta: HTMLTextAreaElement): void {
  // 입력칸을 잠그고(수정 불가), 같은 글을 잠긴 글로 바꾼 뒤 입력값은 바로 비운다
  const written = h('div', { class: 'written', 'aria-hidden': 'true' });
  written.textContent = ta.value;
  ta.blur();
  ta.value = '';
  ta.replaceWith(written);
  card.classList.add('is-locked');

  const head = stepHead('❸', '');
  head.querySelector('.step-text')!.remove();
  app.replaceChildren(head, card);

  const reduced = prefersReducedMotion();
  requestAnimationFrame(() => written.classList.add('is-fading'));

  later(() => {
    const overlay = h('div', { class: 'verse-cover' + (reduced ? ' is-reduced' : ''), role: 'img', 'aria-label': `${VERSE_1JN_1_9.text} (${VERSE_1JN_1_9.ref})` });
    const inner = h('div', { class: 'verse-cover-inner' });
    VERSE_LINES.forEach((line, i) => {
      const span = h('span', { class: 'vline', text: line });
      span.style.animationDelay = `${i * 0.4}s`;
      inner.append(span);
    });
    const ref = h('span', { class: 'vref', text: '요일 1:9' });
    ref.style.animationDelay = `${VERSE_LINES.length * 0.4}s`;
    inner.append(ref);
    overlay.append(inner);
    card.append(overlay);
    fitDiagonal(card, inner);
    later(() => renderTear(card), reduced ? 600 : VERSE_LINES.length * 400 + 700);
  }, reduced ? 250 : 1000);
}

/** 구절 묶음을 카드의 대각선(왼쪽 아래 → 오른쪽 위)에 맞춰 돌리고 크기를 정한다. */
function fitDiagonal(card: HTMLElement, inner: HTMLElement): void {
  const w = card.clientWidth;
  const hgt = card.clientHeight;
  const angle = -Math.atan2(hgt, w) * (180 / Math.PI);
  const diag = Math.hypot(w, hgt);
  // 가장 긴 줄이 대각선의 72% 안에 들어가게
  inner.style.fontSize = '20px';
  inner.style.width = 'max-content';
  const natural = inner.getBoundingClientRect().width || 1;
  const size = Math.max(16, Math.min(34, (20 * diag * 0.72) / natural));
  inner.style.fontSize = `${size}px`;
  inner.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
}

/* ── ❹ 터치해서 찢기 ──────────────────────────────── */
function renderTear(card: HTMLElement): void {
  app.replaceChildren(stepHead('❹', CONFESS.step4), card);

  const hint = h(
    'div',
    { class: 'tear-hint', 'aria-hidden': 'true' },
    h('span', { class: 'ripple' }),
    fingerIcon(),
    h('span', { class: 'tear-hint-text', text: '눌러서 찢으세요' }),
  );
  card.append(hint);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', '눌러서 찢으세요. 세 번 누르면 다 찢어집니다.');
  card.focus({ preventScroll: true });

  const crack = crackLine();
  let taps = 0;

  const onTap = () => {
    taps += 1;
    hint.remove();
    if (taps === 1) {
      vibrate(30);
      card.append(crackSvg(crack));
      card.classList.add('is-shaken');
      later(() => card.classList.remove('is-shaken'), 260);
    } else if (taps === 2) {
      vibrate(45);
      splitInTwo(card, crack);
    } else if (taps === 3) {
      vibrate([30, 40, 70]);
      shatter(crack);
      card.removeEventListener('pointerup', onTap);
    }
  };
  card.addEventListener('pointerup', onTap);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTap();
    }
  });
}

function fingerIcon(): SVGSVGElement {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 48 48');
  s.setAttribute('class', 'finger');
  s.innerHTML =
    '<path d="M19 26V11a3 3 0 0 1 6 0v11l9.2 1.6c2.6.5 4.3 3 3.8 5.6L36.4 38A6 6 0 0 1 30.5 43H24a7 7 0 0 1-5.6-2.8l-6-8a3 3 0 0 1 4.6-3.8L19 31" fill="currentColor" stroke="var(--finger-edge)" stroke-width="2" stroke-linejoin="round"/>';
  return s;
}

/* 찢김선과 조각 모양 (0~1 좌표) */
type P = [number, number];
interface Crack {
  v: P[]; // 세로 찢김선
  cuts: { y: number; left: P[]; right: P[] }[]; // 가로 찢김선 두 개
}

function jitter(n: number): number {
  return (Math.random() * 2 - 1) * n;
}

function crackLine(): Crack {
  const v: P[] = [];
  for (let i = 0; i <= 12; i++) v.push([0.5 + jitter(0.04), i / 12]);
  const cuts = [0.36, 0.68].map((y) => ({
    y,
    left: [0, 0.13, 0.26, 0.38].map((x) => [x, y + jitter(0.03)] as P),
    right: [0.62, 0.75, 0.88, 1].map((x) => [x, y + jitter(0.03)] as P),
  }));
  return { v, cuts };
}

function vx(c: Crack, y: number): number {
  const i = Math.min(11, Math.floor(y * 12));
  const [x0, y0] = c.v[i];
  const [x1, y1] = c.v[i + 1];
  return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
}

function between(c: Crack, yt: number, yb: number): P[] {
  return c.v.filter(([, y]) => y > yt && y < yb);
}

/** col 0=왼쪽, 1=오른쪽 / 위·아래 경계는 가로 찢김선 번호(-1=위 끝, 2=아래 끝) */
function piecePolygon(c: Crack, col: 0 | 1, top: number, bottom: number): P[] {
  const yt = top < 0 ? 0 : c.cuts[top].y;
  const yb = bottom > 1 ? 1 : c.cuts[bottom].y;
  const pts: P[] = [];
  if (col === 0) {
    if (top < 0) pts.push([0, 0]);
    else pts.push(...c.cuts[top].left);
    pts.push([vx(c, yt), yt], ...between(c, yt, yb), [vx(c, yb), yb]);
    if (bottom > 1) pts.push([0, 1]);
    else pts.push(...[...c.cuts[bottom].left].reverse());
  } else {
    pts.push([vx(c, yt), yt]);
    if (top < 0) pts.push([1, 0]);
    else pts.push(...c.cuts[top].right);
    if (bottom > 1) pts.push([1, 1]);
    else pts.push(...[...c.cuts[bottom].right].reverse());
    pts.push([vx(c, yb), yb], ...between(c, yt, yb).reverse());
  }
  return pts;
}

const toClip = (pts: P[]) => `polygon(${pts.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(', ')})`;

function crackSvg(c: Crack): SVGSVGElement {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('class', 'crack');
  s.setAttribute('viewBox', '0 0 100 100');
  s.setAttribute('preserveAspectRatio', 'none');
  s.setAttribute('aria-hidden', 'true');
  const pts = c.v.map(([x, y]) => `${x * 100},${y * 100}`).join(' ');
  s.innerHTML = `<polyline points="${pts}" pathLength="1"/>`;
  return s;
}

function makePiece(card: HTMLElement, rect: DOMRect, clip: string): HTMLElement {
  const piece = h('div', { class: 'piece' });
  piece.style.left = `${rect.left}px`;
  piece.style.top = `${rect.top}px`;
  piece.style.width = `${rect.width}px`;
  piece.style.height = `${rect.height}px`;
  piece.style.clipPath = clip;
  piece.style.setProperty('-webkit-clip-path', clip);
  const copy = card.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.crack, .tear-hint').forEach((n) => n.remove());
  copy.removeAttribute('role');
  copy.removeAttribute('tabindex');
  copy.removeAttribute('aria-label');
  copy.classList.remove('is-shaken');
  copy.style.width = '100%';
  copy.style.height = '100%';
  copy.style.margin = '0';
  piece.append(copy);
  return piece;
}

function splitInTwo(card: HTMLElement, c: Crack): void {
  const rect = card.getBoundingClientRect();
  layer = h('div', { class: 'tear-layer', 'aria-hidden': 'true' });
  document.body.append(layer);
  pieces = [0, 1].map((col) => makePiece(card, rect, toClip(piecePolygon(c, col as 0 | 1, -1, 2))));
  layer.append(...pieces);
  // 원본 카드는 자리만 남기고 비운다
  card.replaceChildren();
  card.classList.add('is-gone');
  card.removeAttribute('aria-label');
  const reduced = prefersReducedMotion();
  pieces.forEach((p, i) => {
    const dir = i === 0 ? -1 : 1;
    p.animate([{ transform: 'none' }, { transform: `translateX(${dir * 14}px) rotate(${dir * 2.5}deg)` }], {
      duration: reduced ? 1 : 320,
      easing: 'cubic-bezier(.2,.8,.3,1)',
      fill: 'forwards',
    });
  });
  // 두 조각을 눌러도 계속 찢긴다
  layer.addEventListener('pointerup', () => card.dispatchEvent(new PointerEvent('pointerup')), { once: true });
}

function shatter(c: Crack): void {
  if (!layer || pieces.length !== 2) return;
  const st = pieces[0].style;
  const fullRect = new DOMRect(parseFloat(st.left), parseFloat(st.top), parseFloat(st.width), parseFloat(st.height));
  const source = pieces[0].firstElementChild as HTMLElement;

  const shards: HTMLElement[] = [];
  for (const col of [0, 1] as const) {
    for (const [top, bottom] of [[-1, 0], [0, 1], [1, 2]] as const) {
      const shard = makePiece(source, fullRect, toClip(piecePolygon(c, col, top, bottom)));
      const dir = col === 0 ? -1 : 1;
      shard.style.transform = `translateX(${dir * 14}px) rotate(${dir * 2.5}deg)`;
      shards.push(shard);
    }
  }
  layer.replaceChildren(...shards);
  pieces = [];

  const reduced = prefersReducedMotion();
  const fall = window.innerHeight + 200;
  shards.forEach((s, i) => {
    const dir = i < 3 ? -1 : 1;
    const start = `translateX(${dir * 14}px) rotate(${dir * 2.5}deg)`;
    const frames = reduced
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [
          { transform: start, opacity: 1 },
          { transform: `translate(${dir * (24 + Math.random() * 30)}px, -${10 + Math.random() * 18}px) rotate(${dir * (6 + Math.random() * 8)}deg)`, opacity: 1, offset: 0.18 },
          { transform: `translate(${dir * (40 + Math.random() * 90)}px, ${fall}px) rotate(${dir * (30 + Math.random() * 70)}deg)`, opacity: 0.9 },
        ];
    s.animate(frames, {
      duration: reduced ? 300 : 1100 + Math.random() * 300,
      delay: reduced ? 0 : (i % 3) * 70 + Math.random() * 60,
      easing: reduced ? 'ease' : 'cubic-bezier(.45,0,.9,.55)',
      fill: 'forwards',
    });
  });

  later(() => {
    // 다 찢어지면 입력값과 DOM을 완전히 비운다
    wipe();
    keepScreenOn(false);
    renderEnd();
  }, reduced ? 450 : 1700);
}

/* ── 끝 화면 ──────────────────────────────────────── */
function verseBlock(v: { text: string; ref: string }): HTMLElement {
  return h('blockquote', { class: 'verse' }, h('p', { text: v.text }), h('cite', { text: v.ref }));
}

function trainSvg(): HTMLElement {
  const wrap = h('figure', { class: 'train', 'aria-label': '기차 그림: 사실 다음에 믿음, 맨 뒤에 감정' });
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 330 92');
  s.setAttribute('aria-hidden', 'true');
  const cars = CONFESS.train;
  const xs = [228, 122, 16]; // 오른쪽(앞)이 기관차
  let inner = '<path class="rail" d="M4 78H326"/>';
  cars.forEach((c, i) => {
    const x = xs[i];
    const engine = i === 0;
    inner += `<g class="${engine ? 'car engine' : 'car'}">`;
    inner += engine
      ? `<path d="M${x} 24h56a10 10 0 0 1 10 10v30H${x}z"/><rect x="${x + 44}" y="10" width="12" height="14" rx="2"/>`
      : `<rect x="${x}" y="28" width="86" height="36" rx="6"/>`;
    inner += `<circle cx="${x + 18}" cy="70" r="7"/><circle cx="${x + (engine ? 50 : 68)}" cy="70" r="7"/>`;
    inner += `<text x="${x + (engine ? 33 : 43)}" y="${engine ? 51 : 52}">${c.word}</text></g>`;
    if (i < cars.length - 1) inner += `<path class="link" d="M${xs[i + 1] + 86} 52H${x}"/>`;
  });
  s.innerHTML = inner;
  wrap.append(s, h('figcaption', { class: 'note', text: cars.map((c) => `${c.car} ${c.word}`).join(' → ') }));
  return wrap;
}

function renderEnd(): void {
  const home = h('a', { class: 'btn btn-primary', href: '../', text: '활동 목록으로' });
  app.replaceChildren(
    h('div', { class: 'end' }, h('p', { class: 'end-thanks', text: CONFESS.thanks })),
    verseBlock(VERSE_1JN_1_9),
    h('div', { class: 'section' }, h('p', { class: 'quote', text: CONFESS.guilt })),
    h('div', { class: 'section' }, verseBlock(VERSE_PS_103_12)),
    h('div', { class: 'section' }, trainSvg()),
    bottomBar(home),
  );
  window.scrollTo({ top: 0 });
}

renderIntro();
