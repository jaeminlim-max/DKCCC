// 저장 기능이 있는 일반 페이지의 공통 초기화. (/confess는 쓰지 않는다)
import '../styles/base.css';
import '../styles/widgets.css';
import { initThemeToggle } from './theme';
import { save } from './storage';
import { registerServiceWorker } from './sw-register';

export function initPage(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (btn) initThemeToggle(btn, (t) => save('theme', t));
  registerServiceWorker();
}
