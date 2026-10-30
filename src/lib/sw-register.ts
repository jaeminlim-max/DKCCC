// 한 번 열린 뒤 오프라인에서도 열리도록 정적 파일만 캐시한다.
// 새 버전이 배포되면 그 버전으로 바뀌는 순간 한 번 새로 고친다 (이 모듈은 /confess에서 쓰지 않는다).
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return; // 처음 설치될 때는 새로 고치지 않는다
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update())
      .catch(() => {
        /* 오프라인 지원 없이 진행 */
      });
  });
}
