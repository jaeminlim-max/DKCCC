// 한 번 열린 뒤 오프라인에서도 열리도록 정적 파일만 캐시한다.
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {
      /* 오프라인 지원 없이 진행 */
    });
  });
}
