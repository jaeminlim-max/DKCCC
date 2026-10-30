// 기도 명단 카드 이미지에 넣는 작은 QR의 내용 형식.
// 다른 브라우저에서 카드 이미지를 올리면 이 QR을 폰 안에서 읽어 이름을 되살린다. (어디로도 전송하지 않음)
const HEAD = 'LTC-PRAYER:1';

export function encodeNames(names: string[]): string {
  return [HEAD, ...names.map((n) => n.replace(/\s+/g, ' ').trim()).filter(Boolean)].join('\n');
}

export function decodeNames(text: string): string[] | null {
  const lines = text.split('\n');
  if (lines[0] !== HEAD) return null;
  return lines.slice(1).map((n) => n.trim()).filter(Boolean);
}
