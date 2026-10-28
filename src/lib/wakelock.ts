// 쓰는 동안 화면이 꺼지지 않게 한다 (지원 기기만). 네트워크와 무관한 기기 기능.
let lock: WakeLockSentinel | null = null;
let wanted = false;

async function acquire(): Promise<void> {
  try {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => {
      lock = null;
    });
  } catch {
    lock = null;
  }
}

export function keepScreenOn(on: boolean): void {
  wanted = on;
  if (on && !lock) void acquire();
  if (!on && lock) {
    void lock.release().catch(() => undefined);
    lock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible' && !lock) void acquire();
});
