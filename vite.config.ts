import { defineConfig, type Plugin } from 'vite';
import { join, relative, resolve } from 'node:path';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// 배포 경로. GitHub Pages 프로젝트 사이트면 '/저장소이름/'.
const base = process.env.SITE_BASE ?? '/';

const pages = ['index', 'circles', 'confess', 'sentence', 'homework', 'prayer-list', 'pledge', 'qr'];
const input = Object.fromEntries(
  pages.map((p) => [p, resolve(__dirname, p === 'index' ? 'index.html' : `${p}/index.html`)]),
);

// 빌드 결과에만 CSP를 넣는다 (개발 서버는 인라인 스타일을 주입하므로 제외).
// 외부 출처는 전부 막는다. /confess는 fetch·XHR·WebSocket 자체를 막는다.
function csp(): Plugin {
  return {
    name: 'ltc-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const isConfess = ctx.path.includes('/confess/');
        const policy = [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          `connect-src ${isConfess ? "'none'" : "'self'"}`,
          "worker-src 'self'",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'none'",
        ].join('; ');
        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}">\n    <meta name="referrer" content="no-referrer">`,
        );
      },
    },
  };
}

// 정적 파일만 미리 캐시하는 서비스 워커를 만든다. 폰트 조각은 쓰일 때 캐시한다.
function serviceWorker(): Plugin {
  return {
    name: 'ltc-sw',
    apply: 'build',
    // 빌드가 끝난 뒤 결과 폴더 전체(HTML·public 포함)를 훑어서 목록을 만든다.
    writeBundle(opts) {
      const outDir = opts.dir!;
      const walk = (d: string): string[] =>
        readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [relative(outDir, join(d, n))]));
      const files = walk(outDir).filter((f) => !f.endsWith('.woff2') && !f.endsWith('.map') && f !== 'sw.js');
      const urls = files.map((f) => './' + f.replace(/(^|\/)index\.html$/, '$1'));
      const version = createHash('sha256').update(files.sort().join('|')).digest('hex').slice(0, 12);
      const source = `// 생성 파일 — vite.config.ts에서 만든다.
const VERSION = '${version}';
const PRECACHE = 'ltc-pre-' + VERSION;
const FONTS = 'ltc-fonts-v1';
const URLS = ${JSON.stringify(urls)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PRECACHE).then((c) => c.addAll(URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PRECACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('.woff2')) {
    e.respondWith(
      caches.open(FONTS).then((c) =>
        c.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; })),
      ),
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || fetch(req)),
  );
});
`;
      writeFileSync(join(outDir, 'sw.js'), source);
    },
  };
}

export default defineConfig({
  base,
  build: {
    rollupOptions: { input },
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    target: 'es2020',
  },
  plugins: [csp(), serviceWorker()],
});
