// localStorage 래퍼. 모든 읽기·쓰기를 try/catch로 감싸고,
// 저장이 안 되는 환경(사생활 보호 모드 등)에서는 메모리에만 둔다.
// 주의: /confess 페이지는 이 모듈을 가져오지 않는다.

const PREFIX = 'ltc:';
const memory = new Map<string, string>();
let available: boolean | null = null;

export function storageAvailable(): boolean {
  if (available !== null) return available;
  try {
    const k = PREFIX + '__probe';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = storageAvailable() ? window.localStorage.getItem(PREFIX + key) : memory.get(key) ?? null;
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): boolean {
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return false;
  }
  try {
    if (storageAvailable()) {
      window.localStorage.setItem(PREFIX + key, raw);
      return true;
    }
  } catch {
    available = false;
  }
  memory.set(key, raw);
  return false;
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* 저장소를 쓸 수 없는 환경 */
  }
  memory.delete(key);
}

/** 저장이 안 되는 환경이면 안내 문구를 붙인다. */
export function warnIfNoStorage(container: HTMLElement): void {
  if (storageAvailable()) return;
  const p = document.createElement('p');
  p.className = 'storage-warning';
  p.textContent = '이 브라우저에서는 저장이 되지 않아요. 화면을 닫으면 적은 내용이 사라집니다. 필요하면 이미지로 저장해 두세요.';
  container.prepend(p);
}
