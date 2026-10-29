// 사영리 9쪽 '두 원' 도식. 책자 그림을 옮기지 않고, 교재 도표(IG PDF p.99)의 설명
// (원 = 인생, 의자 = 마음의 왕좌, 나 = 나 자신, 점 = 크고 작은 일들, 원 밖의 예수 그리스도)을 바탕으로 새로 그렸다.
import { h } from './dom';

const R = 62;
// 왼쪽: 흩어진 점 / 오른쪽: 고르게 놓인 점
const SCATTER: [number, number, number][] = [
  [-40, -32, 4], [34, -38, 3], [-30, 38, 5], [44, 22, 3.5], [-50, 6, 3], [14, 46, 4], [4, -50, 3.5], [-18, -44, 3], [50, -6, 4], [-40, 28, 3],
];
const ORDER: [number, number, number][] = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(a) * 46, Math.sin(a) * 46 + 4, 3.5];
});

const cross = (x: number, y: number, s: number) =>
  `<g class="cf-cross"><path d="M${x} ${y - s}V${y + s * 1.3}M${x - s * 0.7} ${y - s * 0.25}H${x + s * 0.7}"/></g>`;
// 의자: 등받이는 왼쪽, 앉는 자리는 y+2
const chair = (x: number, y: number) =>
  `<path class="cf-chair" d="M${x - 17} ${y - 22}V${y + 14}M${x - 17} ${y + 2}H${x + 15}V${y + 14}"/>`;
const me = (x: number, y: number, size: number) => `<text class="cf-me" x="${x}" y="${y}" font-size="${size}">나</text>`;
const dots = (cx: number, cy: number, list: [number, number, number][]) =>
  list.map(([x, y, r]) => `<circle class="cf-dot" cx="${cx + x}" cy="${cy + y}" r="${r}"/>`).join('');

const ICON: Record<string, string> = {
  ring: '<circle cx="12" cy="12" r="9" class="cf-ring"/>',
  chair: '<path class="cf-chair" d="M7 4V20M7 13H18V20"/>',
  me: '<text class="cf-me" x="12" y="17" font-size="15">나</text>',
  dot: '<circle class="cf-dot" cx="12" cy="12" r="4"/>',
  cross: '<g class="cf-cross"><path d="M12 3V21M6 9H18"/></g>',
};
const LEGEND: [keyof typeof ICON, string][] = [
  ['ring', '인생'],
  ['chair', '마음의 왕좌'],
  ['me', '나 자신'],
  ['dot', '크고 작은 일들'],
  ['cross', '예수 그리스도'],
];

export function circlesFigure(): HTMLElement {
  const L = 84;
  const Rx = 246;
  const Y = 84;
  const svg = `
    <svg viewBox="0 0 330 186" role="img" aria-label="두 원 그림. 왼쪽: 나 자신이 마음의 왕좌에 있고 예수 그리스도는 원 밖에 있으며 점들이 흩어져 있음. 오른쪽: 예수 그리스도가 왕좌에 있고 나는 그 아래, 점들이 고르게 놓여 있음.">
      <circle class="cf-ring" cx="${L}" cy="${Y}" r="${R}"/>
      ${dots(L, Y, SCATTER)}
      ${chair(L, Y + 8)}${me(L + 1, Y + 6, 21)}
      ${cross(L - R - 4, Y - R + 6, 12)}
      <circle class="cf-ring" cx="${Rx}" cy="${Y}" r="${R}"/>
      ${dots(Rx, Y, ORDER)}
      ${chair(Rx, Y + 4)}${cross(Rx + 1, Y - 9, 11)}${me(Rx, Y + 40, 17)}
      <text class="cf-side" x="${L}" y="${Y + R + 30}">왼쪽</text>
      <text class="cf-side" x="${Rx}" y="${Y + R + 30}">오른쪽</text>
    </svg>`;
  const fig = h('figure', { class: 'circles-figure' });
  fig.innerHTML = svg;
  const legend = h('ul', { class: 'cf-legend', 'aria-label': '그림 설명' });
  for (const [icon, label] of LEGEND) {
    const li = h('li', {});
    li.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[icon]}</svg>`;
    li.append(h('span', { text: label }));
    legend.append(li);
  }
  fig.append(legend);
  return fig;
}
