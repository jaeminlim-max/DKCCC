// 다크 모드: 기본은 기기 설정(prefers-color-scheme), 버튼으로 수동 전환.
// 저장은 호출한 쪽이 onChange로 한다. /confess는 onChange 없이 쓴다.

export type Theme = 'light' | 'dark';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === 'light' || t === 'dark' ? t : systemTheme();
}

const MOON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>';
const SUN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

export function initThemeToggle(button: HTMLButtonElement, onChange?: (t: Theme) => void): void {
  const render = () => {
    const dark = currentTheme() === 'dark';
    button.innerHTML = (dark ? SUN : MOON) + `<span>${dark ? '밝게' : '어둡게'}</span>`;
    button.setAttribute('aria-label', dark ? '밝은 화면으로 바꾸기' : '어두운 화면으로 바꾸기');
  };
  button.addEventListener('click', () => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    onChange?.(next);
    render();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  render();
}
