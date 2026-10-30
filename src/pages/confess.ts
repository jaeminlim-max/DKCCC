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
  document.querySelectorAll('canvas').forEach((c) => {
    c.width = 0;
    c.height = 0;
  });
  document.querySelectorAll('.tear-layer, .dim-layer, .veil').forEach((n) => n.remove());
  veil = null;
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

// 페이지를 떠나면(뒤로가기·새로고침·닫기) 바로 비운다.
window.addEventListener('pagehide', wipe);
window.addEventListener('pageshow', (e) => {
  if (e.persisted) restart();
});
document.addEventListener('freeze', wipe);

// 화면이 가려지면(알림센터·제어센터·앱 전환) 가림막으로 덮는다.
// 웹에서는 알림센터와 앱 전환을 구분할 수 없으므로, 60초 안에 돌아오면 이어서 쓰고
// 그보다 오래 비우면 처음부터 다시 시작한다.
const KEEP_MS = 60_000;
let hiddenAt = 0;
let veil: HTMLElement | null = null;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now();
    if (!veil && app.querySelector('.paper, .pray')) {
      veil = h('div', { class: 'veil', 'aria-hidden': 'true' }, h('p', { text: '돌아오면 이어서 쓸 수 있어요' }));
      document.body.append(veil);
    }
    return;
  }
  const away = Date.now() - hiddenAt;
  veil?.remove();
  veil = null;
  if (!app.firstChild) renderIntro();
  else if (hiddenAt && away > KEEP_MS && !app.querySelector('.end')) restart();
});

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

type Mode = 'type' | 'hand';
let mode: Mode = 'type';

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
  const hand = createHandwriting(card);
  card.append(ta, hand.canvas);

  const done = h('button', { class: 'btn btn-primary', type: 'button', text: '작성 완료', disabled: '' });
  const hasContent = () => (mode === 'type' ? ta.value.trim() !== '' : hand.hasInk());
  const update = () => {
    done.disabled = !hasContent();
  };
  ta.addEventListener('input', update);
  hand.onChange = update;

  /* 쓰는 방법: 타이핑 / 손글씨 */
  const typeBtn = h('button', { type: 'button', class: 'mode-btn', 'aria-pressed': 'true' });
  typeBtn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>타이핑';
  const handBtn = h('button', { type: 'button', class: 'mode-btn', 'aria-pressed': 'false' });
  handBtn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/></svg>손글씨';
  const undoBtn = h('button', { type: 'button', class: 'btn tool', text: '되돌리기' });
  const clearBtn = h('button', { type: 'button', class: 'btn tool', text: '모두 지우기' });
  const handTools = h('div', { class: 'hand-tools' }, undoBtn, clearBtn);
  undoBtn.addEventListener('click', () => hand.undo());
  clearBtn.addEventListener('click', () => hand.clear());

  const setMode = (m: Mode) => {
    if (m === mode) return;
    if (hasContent() && !window.confirm('지금 쓴 내용은 지워집니다. 쓰는 방법을 바꿀까요?')) return;
    ta.value = '';
    hand.clear();
    mode = m;
    applyMode();
  };
  const applyMode = () => {
    typeBtn.setAttribute('aria-pressed', String(mode === 'type'));
    handBtn.setAttribute('aria-pressed', String(mode === 'hand'));
    ta.hidden = mode !== 'type';
    hand.canvas.hidden = mode !== 'hand';
    handTools.hidden = mode !== 'hand';
    card.classList.toggle('is-hand', mode === 'hand');
    update();
    if (mode === 'type') ta.focus({ preventScroll: true });
    else {
      ta.blur();
      hand.resize();
    }
  };
  typeBtn.addEventListener('click', () => setMode('type'));
  handBtn.addEventListener('click', () => setMode('hand'));

  done.addEventListener('click', () => {
    if (!hasContent()) return;
    renderCover(card, mode === 'type' ? ta : hand.canvas, hand);
  });

  const modeRow = h('div', { class: 'mode-row', role: 'group', 'aria-label': '쓰는 방법' }, typeBtn, handBtn);
  app.replaceChildren(stepHead('❷', CONFESS.step2), modeRow, handTools, card, bottomBar(done));
  applyMode();
}

/* 손글씨: 손가락으로 쓰는 캔버스. 획은 메모리에만 있고 어디에도 저장하지 않는다. */
type Pt = [number, number];
interface Hand {
  canvas: HTMLCanvasElement;
  hasInk: () => boolean;
  undo: () => void;
  clear: () => void;
  resize: () => void;
  lock: () => void;
  onChange: () => void;
}

function createHandwriting(card: HTMLElement): Hand {
  const canvas = h('canvas', { class: 'hand-canvas', 'aria-label': '손글씨로 쓰는 곳' });
  const ctx = canvas.getContext('2d')!;
  let strokes: Pt[][] = [];
  let current: Pt[] | null = null;
  let locked = false;

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = getComputedStyle(card).color;
    ctx.lineWidth = 2.6 * (canvas.width / Math.max(1, canvas.clientWidth));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes) {
      ctx.beginPath();
      s.forEach(([x, y], i) => (i ? ctx.lineTo(x * canvas.width, y * canvas.height) : ctx.moveTo(x * canvas.width, y * canvas.height)));
      if (s.length === 1) ctx.lineTo(s[0][0] * canvas.width + 0.5, s[0][1] * canvas.height);
      ctx.stroke();
    }
  };
  const resize = () => {
    const r = card.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    draw();
  };
  const point = (e: PointerEvent): Pt => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  // iOS: 길게 누를 때 돋보기·복사 메뉴가 뜨지 않게 터치 기본 동작을 막는다
  const block = (e: TouchEvent) => e.preventDefault();
  canvas.addEventListener('touchstart', block, { passive: false });
  canvas.addEventListener('touchmove', block, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (locked) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    current = [point(e)];
    strokes.push(current);
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!current) return;
    for (const ev of e.getCoalescedEvents?.() ?? [e]) current.push(point(ev));
    draw();
  });
  const end = () => {
    if (!current) return;
    current = null;
    hand.onChange();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  const ro = new ResizeObserver(() => {
    if (!locked) resize();
  });
  ro.observe(card);

  const hand: Hand = {
    canvas,
    hasInk: () => strokes.length > 0,
    undo: () => {
      strokes.pop();
      draw();
      hand.onChange();
    },
    clear: () => {
      strokes = [];
      draw();
      hand.onChange();
    },
    resize,
    lock: () => {
      locked = true;
      ro.disconnect();
    },
    onChange: () => undefined,
  };
  cleanupFns.push(() => {
    strokes = [];
    ro.disconnect();
    canvas.width = 0;
    canvas.height = 0;
  });
  return hand;
}

/* ── ❸ 흐려지고 요일 1:9이 대각선으로 덮음 ───────── */
// 구절을 줄로 나눈 것 (본문은 그대로)
const VERSE_LINES = ['만일 우리가 우리 죄를 자백하면', '그는 미쁘시고 의로우사', '우리 죄를 사하시며', '우리를 모든 불의에서', '깨끗하게 하실 것이요'];

function renderCover(card: HTMLElement, source: HTMLTextAreaElement | HTMLCanvasElement, hand: Hand): void {
  // 잠그기(수정 불가). 타이핑은 같은 글을 잠긴 글로 바꾸고 입력값은 바로 비운다. 손글씨는 캔버스를 잠근다.
  let written: HTMLElement;
  card.querySelectorAll('textarea, canvas').forEach((el) => {
    if (el !== source) el.remove();
  });
  if (source instanceof HTMLTextAreaElement) {
    written = h('div', { class: 'written ink-layer', 'aria-hidden': 'true' });
    written.textContent = source.value;
    source.blur();
    source.value = '';
    source.replaceWith(written);
  } else {
    hand.lock();
    written = source;
    written.classList.add('ink-layer');
    written.setAttribute('aria-hidden', 'true');
  }
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

/** 구절 묶음을 카드의 대각선(왼쪽 아래 → 오른쪽 위)으로 돌리고, 돌린 모양 전체가 카드 안에 들어가게 크기를 정한다. */
function fitDiagonal(card: HTMLElement, inner: HTMLElement): void {
  const w = card.clientWidth;
  const hgt = card.clientHeight;
  const rad = Math.atan2(hgt, w);
  inner.style.fontSize = '20px';
  inner.style.width = 'max-content';
  const L = inner.offsetWidth || 1; // 가장 긴 줄의 길이
  const T = inner.offsetHeight || 1; // 묶음의 두께
  const boxW = L * Math.cos(rad) + T * Math.sin(rad);
  const boxH = L * Math.sin(rad) + T * Math.cos(rad);
  const scale = Math.min((w * 0.88) / boxW, (hgt * 0.72) / boxH);
  inner.style.fontSize = `${Math.max(14, Math.min(34, 20 * scale))}px`;
  inner.style.transform = `translate(-50%, -50%) rotate(${-rad * (180 / Math.PI)}deg)`;
}

/* ── ❹ 터치해서 찢기 ──────────────────────────────── */
function renderTear(card: HTMLElement): void {
  // 구절을 다 나타난 상태로 고정한다 (찢긴 조각으로 복사될 때 애니메이션이 다시 돌지 않도록)
  card.querySelector('.verse-cover')?.classList.add('is-done');
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
  card.setAttribute('aria-label', '눌러서 찢으세요.');
  card.focus({ preventScroll: true });

  const crack = crackLine();
  let started = false;

  // 한 번 누르면 찢김선 → 두 조각 → 여러 조각 → 가루가 되어 위로 날아감까지 이어진다
  const onTap = () => {
    if (started) return;
    started = true;
    hint.remove();
    card.removeEventListener('pointerup', onTap);
    const reduced = prefersReducedMotion();
    vibrate(30);
    card.append(crackSvg(crack));
    card.classList.add('is-shaken');
    later(() => {
      card.classList.remove('is-shaken');
      vibrate(45);
      splitInTwo(card, crack);
    }, reduced ? 150 : 420);
    later(() => {
      vibrate([30, 40, 70]);
      shatter(crack);
    }, reduced ? 300 : 950);
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

const SEG = 56; // 세로 찢김선 마디 수 (많을수록 가장자리가 잘게 들쭉날쭉)

function walk(from: number, n: number, step: number, lo: number, hi: number): number[] {
  const out = [from];
  let x = from;
  for (let i = 1; i < n; i++) {
    x += jitter(step) + (Math.random() < 0.12 ? jitter(step * 2.5) : 0);
    x = Math.max(lo, Math.min(hi, x));
    out.push(x);
  }
  return out;
}

function crackLine(): Crack {
  const xs = walk(0.5 + jitter(0.03), SEG + 1, 0.012, 0.4, 0.6);
  const v: P[] = xs.map((x, i) => [x, i / SEG]);
  const cuts = [0.36, 0.68].map((y) => {
    const ly = walk(y + jitter(0.02), 9, 0.01, y - 0.05, y + 0.05);
    const ry = walk(y + jitter(0.02), 9, 0.01, y - 0.05, y + 0.05);
    return {
      y,
      left: ly.map((yy, i) => [i * 0.05, yy] as P),
      right: ry.map((yy, i) => [0.6 + i * 0.05, yy] as P),
    };
  });
  return { v, cuts };
}

function vx(c: Crack, y: number): number {
  const n = c.v.length - 1;
  const i = Math.min(n - 1, Math.floor(y * n));
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
  // 찢긴 틈(어두운 선) + 종이 속살(밝은 결) + 삐져나온 섬유 몇 가닥
  let fibers = '';
  for (let i = 3; i < c.v.length - 2; i += 3) {
    const [x, y] = c.v[i];
    const len = 0.6 + Math.random() * 1.4;
    const dir = Math.random() < 0.5 ? -1 : 1;
    fibers += `<path class="fiber" d="M${x * 100} ${y * 100}l${dir * len} ${jitter(0.8)}"/>`;
  }
  s.innerHTML = `<polyline class="tear-core" points="${pts}" pathLength="1"/><polyline class="tear-gap" points="${pts}" pathLength="1"/><g class="fibers">${fibers}</g>`;
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
  // 캔버스는 복제해도 그림이 따라오지 않으므로 직접 옮겨 그린다
  const from = card.querySelectorAll('canvas');
  copy.querySelectorAll('canvas').forEach((c, i) => {
    const src = from[i];
    if (!src) return;
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d')?.drawImage(src, 0, 0);
  });
  copy.style.width = '100%';
  copy.style.height = '100%';
  copy.style.margin = '0';
  piece.append(copy);
  return piece;
}

// 두 조각은 찢김선 아래 끝을 축으로 V자로 벌어진다
const halfEnd = (dir: number) => `translateX(${dir * 7}px) rotate(${dir * 5}deg)`;
const tearOrigin = (c: Crack) => `${(c.v[c.v.length - 1][0] * 100).toFixed(1)}% 100%`;

function splitInTwo(card: HTMLElement, c: Crack): void {
  const rect = card.getBoundingClientRect();
  layer = h('div', { class: 'tear-layer', 'aria-hidden': 'true' });
  document.body.append(layer);
  const dark = card.classList.contains('is-dark');
  pieces = [0, 1].map((col) => makePiece(card, rect, toClip(piecePolygon(c, col as 0 | 1, -1, 2))));
  pieces.forEach((p) => {
    p.style.transformOrigin = tearOrigin(c);
    p.classList.toggle('is-dark', dark);
  });
  layer.append(...pieces);
  // 원본 카드는 자리만 남기고 비운다
  card.replaceChildren();
  card.classList.add('is-gone');
  card.removeAttribute('aria-label');
  const reduced = prefersReducedMotion();
  pieces.forEach((p, i) => {
    const dir = i === 0 ? -1 : 1;
    p.animate([{ transform: 'none' }, { transform: halfEnd(dir) }], {
      duration: reduced ? 1 : 380,
      easing: 'cubic-bezier(.3,.7,.2,1)',
      fill: 'forwards',
    });
  });
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
      shard.style.transformOrigin = tearOrigin(c);
      shard.style.transform = halfEnd(dir);
      shard.classList.toggle('is-dark', pieces[0].classList.contains('is-dark'));
      shards.push(shard);
    }
  }
  layer.replaceChildren(...shards);
  pieces = [];

  const reduced = prefersReducedMotion();
  // 여섯 조각이 살짝 벌어진 뒤 가루가 되어 위로 날아간다
  shards.forEach((sh, i) => {
    const dir = i < 3 ? -1 : 1;
    const row = i % 3;
    const start = halfEnd(dir);
    const spread = `translate(${dir * (22 + row * 6)}px, ${(row - 1) * 10}px) rotate(${dir * (4 + row * 2)}deg)`;
    const rise = `translate(${dir * (30 + row * 8)}px, ${-40 - row * 12}px) rotate(${dir * (8 + row * 3)}deg) scale(0.92)`;
    sh.animate(
      reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { transform: start, opacity: 1, filter: 'blur(0px)' },
            { transform: spread, opacity: 1, filter: 'blur(0px)', offset: 0.25 },
            { transform: rise, opacity: 0, filter: 'blur(2px)' },
          ],
      { duration: reduced ? 300 : 1500, delay: reduced ? 0 : 200 + (2 - row) * 120, easing: 'ease-in', fill: 'forwards' },
    );
  });
  if (!reduced) dust(fullRect, source);

  later(() => {
    // 다 사라지면 입력값과 DOM을 완전히 비운다
    wipe();
    keepScreenOn(false);
    renderEnd();
  }, reduced ? 450 : 2900);
}

/** 종이 자리에서 가루가 피어올라 위로 흩어진다 (캔버스 한 장, 끝나면 지움). */
function dust(rect: DOMRect, paper: HTMLElement): void {
  if (!layer) return;
  const cs = getComputedStyle(paper);
  // 종이 가루는 배경에 묻히지 않게 종이보다 한 톤 진하게(어두운 종이는 밝게)
  const paperDust = paper.classList.contains('is-dark') ? '#5a6274' : '#c9bd9c';
  const colors = [
    paperDust,
    paperDust,
    paperDust,
    cs.getPropertyValue('--paper-ink').trim() || '#1d2433',
    cs.getPropertyValue('--verse-ink').trim() || '#2f5bd3',
  ];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = h('canvas', { class: 'dust' });
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  layer.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  type P = { x: number; y: number; vx: number; vy: number; r: number; c: string; born: number; life: number; wob: number };
  const ps: P[] = [];
  const N = Math.min(1100, Math.round((rect.width * rect.height) / 75));
  for (let i = 0; i < N; i++) {
    const u = Math.random();
    const v = Math.random();
    // 아래쪽부터 위쪽으로 차례로 흩어진다
    ps.push({
      x: rect.left + u * rect.width,
      y: rect.top + v * rect.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(0.6 + Math.random() * 1.6),
      r: 1 + Math.random() * 2.2,
      c: colors[(Math.random() * colors.length) | 0],
      born: 250 + (1 - v) * 700 + Math.random() * 250,
      life: 1100 + Math.random() * 900,
      wob: Math.random() * Math.PI * 2,
    });
  }
  const t0 = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const t = now - t0;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = false;
    for (const p of ps) {
      const age = t - p.born;
      if (age < 0) {
        alive = true;
        continue;
      }
      if (age > p.life) continue;
      alive = true;
      const k = age / 16;
      const x = p.x + p.vx * k + Math.sin(p.wob + age / 260) * 6;
      const y = p.y + p.vy * k - (age * age) / 9000;
      ctx.globalAlpha = Math.max(0, 1 - age / p.life);
      ctx.fillStyle = p.c;
      ctx.fillRect(x, y, p.r, p.r);
    }
    if (alive) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  cleanupFns.push(() => {
    cancelAnimationFrame(raf);
    canvas.width = 0;
    canvas.height = 0;
  });
}

/* ── 끝 화면 ──────────────────────────────────────── */
function verseBlock(v: { text: string; ref: string }): HTMLElement {
  return h('blockquote', { class: 'verse' }, h('p', { text: v.text }), h('cite', { text: v.ref }));
}

function trainSvg(): HTMLElement {
  const wrap = h('figure', { class: 'train', 'aria-label': '기차 그림: 맨 앞 기관차는 사실, 그 뒤 탄수차는 믿음, 맨 뒤 객차는 감정' });
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 330 92');
  s.setAttribute('aria-hidden', 'true');
  const cars = CONFESS.train;
  const xs = [16, 106, 214]; // 왼쪽(앞)이 기관차, 오른쪽 끝이 객차
  const widths = [70, 86, 96];
  let inner = '<path class="rail" d="M4 78H326"/>';
  cars.forEach((c, i) => {
    const x = xs[i];
    const w = widths[i];
    const engine = i === 0;
    inner += `<g class="${engine ? 'car engine' : 'car'}">`;
    inner += engine
      ? `<path d="M${x + w} 24H${x + 10}a10 10 0 0 0 -10 10v30H${x + w}z"/><rect x="${x + 10}" y="10" width="12" height="14" rx="2"/>`
      : `<rect x="${x}" y="28" width="${w}" height="36" rx="6"/>`;
    inner += `<circle cx="${x + 18}" cy="70" r="7"/><circle cx="${x + w - 18}" cy="70" r="7"/>`;
    inner += `<text x="${x + w / 2}" y="${engine ? 51 : 52}">${c.word}</text></g>`;
    if (i < cars.length - 1) inner += `<path class="link" d="M${x + w} 52H${xs[i + 1]}"/>`;
  });
  s.innerHTML = inner;
  wrap.append(s, h('figcaption', { class: 'train-caption', text: CONFESS.trainCaption }));
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
