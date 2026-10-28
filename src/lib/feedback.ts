// 진동(지원 시)과 부드러운 알림음. 소리는 파일 없이 WebAudio로 만든다.

export function vibrate(pattern: number | number[]): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* 지원 안 함 */
  }
}

let ctx: AudioContext | null = null;

/** 사용자의 터치 안에서 한 번 불러 두어야 iOS에서 소리가 난다. */
export function unlockAudio(): void {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function chime(): void {
  try {
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.28;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    });
  } catch {
    /* 소리 없이 진행 */
  }
}

export function notifyEnd(): void {
  vibrate([180, 90, 180]);
  chime();
}
