// QR 모듈(검은 칸) 정보를 JSON으로 만든다. 학생 폰은 QR 라이브러리를 받지 않는다.
import QRCode from 'qrcode';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SITE_URL } from '../site.config.mjs';

const pages = [
  { path: '', title: 'LTC 초급 활동 (홈)' },
  { path: 'circles/', title: '세 원 그리기' },
  { path: 'confess/', title: '죄 목록' },
  { path: 'sentence/', title: '문장 하나 들고 가기' },
  { path: 'homework/', title: '과제' },
  { path: 'prayer-list/', title: '기도 명단 카드' },
  { path: 'pledge/', title: '결단 카드' },
];

const out = pages.map((p) => {
  const url = SITE_URL + p.path;
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const bits = Array.from(qr.modules.data, (b) => (b ? '1' : '0')).join('');
  return { ...p, url, short: url.replace(/^https?:\/\//, '').replace(/\/$/, ''), size, bits };
});

mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/qr.json', JSON.stringify({ site: SITE_URL, pages: out }, null, 0));
console.log(`QR ${out.length}개 생성: ${SITE_URL}`);
