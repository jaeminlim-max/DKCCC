// 캔버스에 한글 문장을 줄바꿈해 그리는 도구.

export const FONT = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

export function font(weight: number, px: number): string {
  return `${weight} ${px}px ${FONT}`;
}

/** 그릴 글자의 폰트 조각을 먼저 불러온다 (오프라인이면 기본 폰트로 그린다). */
export async function ensureFont(texts: string[], weights: number[] = [400, 700, 800]): Promise<void> {
  try {
    const sample = texts.join('') || '가';
    await Promise.all(weights.map((w) => document.fonts.load(font(w, 40), sample)));
  } catch {
    /* 기본 폰트로 진행 */
  }
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');
  ctx.textBaseline = 'alphabetic';
  return [c, ctx];
}

/** 띄어쓰기 기준으로 줄을 나누고, 한 단어가 너무 길면 글자 단위로 자른다. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      const test = line + word;
      if (ctx.measureText(test).width <= maxWidth || line.trim() === '') {
        if (ctx.measureText(test).width > maxWidth) {
          for (const ch of word) {
            if (ctx.measureText(line + ch).width > maxWidth && line) {
              lines.push(line);
              line = ch;
            } else line += ch;
          }
        } else line = test;
      } else {
        lines.push(line.trimEnd());
        line = word.trimStart();
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** 줄바꿈해서 그리고, 마지막 줄 아래 y를 돌려준다. */
export function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  for (const line of wrap(ctx, text, maxWidth)) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}
