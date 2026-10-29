// 간증문 제출·간사용 조회 서버(간사님 Google Apps Script 웹 앱).
// 주소는 빌드할 때 VITE_GAS_URL로 넣는다. 비어 있으면 제출·조회 기능을 감춘다.
// 이 모듈은 /homework와 /staff에서만 쓴다. (/confess는 모든 네트워크 요청이 CSP로 막혀 있다)

export const GAS_URL: string = import.meta.env.VITE_GAS_URL ?? '';
export const serverReady = (): boolean => GAS_URL !== '';

/** 2026-11-09 23:59:59 (한국 시간)까지 제출을 받는다. 서버도 같은 마감을 확인한다. */
export const DEADLINE = Date.parse('2026-11-09T23:59:59+09:00');
export const isOpen = (now = Date.now()): boolean => now <= DEADLINE;

export interface Submission {
  at: string;
  name: string;
  answers: string[];
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

async function call<T>(body: Record<string, unknown>): Promise<Result<T>> {
  if (!serverReady()) return { ok: false, error: 'not_configured' };
  try {
    // text/plain으로 보내야 브라우저가 사전 요청(preflight) 없이 보낸다 (Apps Script 제약)
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!res.ok) return { ok: false, error: 'http_' + res.status };
    return (await res.json()) as Result<T>;
  } catch {
    return { ok: false, error: 'network' };
  }
}

export const submitTestimony = (name: string, answers: string[]) => call<object>({ action: 'submit', name, answers });
export const listTestimonies = (password: string) => call<{ rows: Submission[] }>({ action: 'list', password });

export function errorText(error: string): string {
  switch (error) {
    case 'network':
      return '인터넷에 연결되지 않았어요. 연결한 뒤 다시 눌러 주세요.';
    case 'closed':
      return '제출 기간(11월 9일)이 끝났습니다.';
    case 'empty':
      return '이름과 간증문을 적어 주세요.';
    case 'wrong':
      return '암호가 맞지 않습니다.';
    case 'locked':
      return '암호가 여러 번 틀려 10분 동안 잠겼습니다. 잠시 뒤 다시 시도하세요.';
    case 'not_configured':
      return '제출 서버가 아직 연결되지 않았습니다.';
    default:
      return '서버 오류가 났어요. 잠시 뒤 다시 시도하세요.';
  }
}
