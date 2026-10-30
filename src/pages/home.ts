import { initPage } from '../lib/page';
import { load, save } from '../lib/storage';
import { ROUTES } from '../routes';
import { h } from '../lib/dom';
import '../styles/home.css';

initPage();
document.getElementById('build-id')!.textContent = `버전 ${__BUILD_ID__}`;

type Day = 'mon' | 'tue';

for (const day of ['mon', 'tue'] as Day[]) {
  const list = document.querySelector<HTMLOListElement>(`#panel-${day} .activity-list`)!;
  for (const r of ROUTES.filter((x) => x.day === day)) {
    const body = h('span', { class: 'act-body' }, h('span', { class: 'act-title', text: r.title }), h('span', { class: 'act-where', text: r.where }));
    const time = h('span', { class: 'act-time', text: r.time ?? '' });
    const item = r.ready
      ? h('a', { class: 'act', href: './' + r.path }, time, body, chevron())
      : h('div', { class: 'act is-soon', 'aria-disabled': 'true' }, time, body, h('span', { class: 'soon', text: '준비 중' }));
    list.append(h('li', {}, item));
  }
}

function chevron(): SVGSVGElement {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'act-go');
  s.innerHTML = '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
  return s;
}

function today(): Day {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  if (ymd === '2026-11-3') return 'tue';
  if (ymd === '2026-11-2') return 'mon';
  return load<Day>('home-day', 'mon') === 'tue' ? 'tue' : 'mon';
}

function select(day: Day, remember: boolean): void {
  for (const d of ['mon', 'tue'] as Day[]) {
    const tab = document.getElementById(`tab-${d}`)!;
    const on = d === day;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    document.getElementById(`panel-${d}`)!.hidden = !on;
  }
  if (remember) save('home-day', day);
}

document.querySelectorAll<HTMLButtonElement>('[role=tab]').forEach((tab) => {
  tab.addEventListener('click', () => select(tab.dataset.day as Day, true));
  tab.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const next: Day = tab.dataset.day === 'mon' ? 'tue' : 'mon';
    select(next, true);
    document.getElementById(`tab-${next}`)!.focus();
  });
});

select(today(), false);
