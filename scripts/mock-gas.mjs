// 테스트용 모의 서버: docs/apps-script/Code.gs와 같은 규칙으로 응답한다 (메모리 저장).
// node scripts/mock-gas.mjs  →  http://localhost:4175/exec   (암호: MOCK_PASSWORD, 기본 'test-pw')
import { createServer } from 'node:http';
const PASSWORD = process.env.MOCK_PASSWORD ?? 'test-pw';
const DEADLINE = Date.parse(process.env.MOCK_DEADLINE ?? '2026-11-09T23:59:59+09:00');
const rows = [];
let fails = 0;
const clip = (x, n) => String(x ?? '').trim().slice(0, n);
createServer((req, res) => {
  const send = (o) => {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(o));
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(400);
    return res.end(); // Apps Script처럼 사전 요청을 받지 않는다
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    let r;
    try {
      r = JSON.parse(body);
    } catch {
      return send({ ok: false, error: 'bad_request' });
    }
    if (r.action === 'submit') {
      if (Date.now() > DEADLINE) return send({ ok: false, error: 'closed' });
      const name = clip(r.name, 40);
      const answers = [0, 1, 2].map((i) => clip((r.answers || [])[i], 5000));
      if (!name || !answers.join('')) return send({ ok: false, error: 'empty' });
      rows.push({ at: new Date().toISOString(), name, answers });
      return send({ ok: true });
    }
    if (r.action === 'list') {
      if (fails >= 10) return send({ ok: false, error: 'locked' });
      if (r.password !== PASSWORD) {
        fails++;
        return send({ ok: false, error: 'wrong' });
      }
      return send({ ok: true, rows });
    }
    send({ ok: false, error: 'unknown_action' });
  });
}).listen(4175, () => console.log('mock GAS on :4175'));
