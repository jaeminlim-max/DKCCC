// 카운트다운 타이머. 화면이 잠깐 가려져도 실제 시각 기준으로 맞춘다.
import { h } from './dom';
import { notifyEnd, unlockAudio } from './feedback';

export interface TimerOptions {
  seconds: number;
  label?: string;
  /** 같은 시간을 몇 번 돌리는지 (예: 짝에게 1분 30초씩 두 번) */
  rounds?: number;
  roundLabel?: (round: number) => string;
  startText?: string;
  onEnd?: (round: number) => void;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function createTimer(opts: TimerOptions): HTMLElement {
  const total = opts.seconds * 1000;
  const rounds = opts.rounds ?? 1;
  let round = 1;
  let remaining = total;
  let endAt = 0;
  let tick = 0;
  let running = false;

  const R = 54;
  const C = 2 * Math.PI * R;
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ring.setAttribute('viewBox', '0 0 120 120');
  ring.setAttribute('aria-hidden', 'true');
  ring.innerHTML = `<circle cx="60" cy="60" r="${R}" class="timer-track"/><circle cx="60" cy="60" r="${R}" class="timer-progress" stroke-dasharray="${C}" stroke-dashoffset="0"/>`;
  const progress = ring.querySelector('.timer-progress') as SVGCircleElement;

  const time = h('div', { class: 'timer-time', text: fmt(total), role: 'timer', 'aria-live': 'off' });
  const caption = h('div', { class: 'timer-caption' });
  const face = h('div', { class: 'timer-face' }, ring, h('div', { class: 'timer-center' }, time, caption));

  const startBtn = h('button', { class: 'btn btn-primary', type: 'button' });
  const resetBtn = h('button', { class: 'btn', type: 'button', text: '처음부터' });
  const status = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const root = h('div', { class: 'timer' }, face, h('div', { class: 'btn-row' }, startBtn, resetBtn), status);
  if (opts.label) root.prepend(h('p', { class: 'timer-label', text: opts.label }));

  const render = () => {
    time.textContent = fmt(remaining);
    progress.setAttribute('stroke-dashoffset', String(C * (1 - remaining / total)));
    caption.textContent = rounds > 1 ? (opts.roundLabel?.(round) ?? `${round} / ${rounds}`) : '';
    if (running) startBtn.textContent = '잠깐 멈춤';
    else if (remaining === total) startBtn.textContent = opts.startText ?? '시작';
    else if (remaining <= 0) startBtn.textContent = round < rounds ? '다음 사람 시작' : '다시 시작';
    else startBtn.textContent = '이어서';
    resetBtn.hidden = remaining === total && round === 1 && !running;
    root.classList.toggle('is-running', running);
    root.classList.toggle('is-done', remaining <= 0);
  };

  const stop = () => {
    running = false;
    window.clearInterval(tick);
  };

  const step = () => {
    remaining = endAt - Date.now();
    if (remaining <= 0) {
      remaining = 0;
      stop();
      notifyEnd();
      status.textContent = '시간이 끝났습니다.';
      opts.onEnd?.(round);
    }
    render();
  };

  startBtn.addEventListener('click', () => {
    unlockAudio();
    if (running) {
      stop();
      remaining = endAt - Date.now();
      render();
      return;
    }
    if (remaining <= 0) {
      round = round < rounds ? round + 1 : 1;
      remaining = total;
    }
    running = true;
    endAt = Date.now() + remaining;
    tick = window.setInterval(step, 200);
    step();
  });

  resetBtn.addEventListener('click', () => {
    stop();
    round = 1;
    remaining = total;
    render();
  });

  document.addEventListener('visibilitychange', () => {
    if (running && document.visibilityState === 'visible') step();
  });

  render();
  return root;
}
