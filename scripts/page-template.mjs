// 하위 페이지 HTML 뼈대 생성기: node scripts/page-template.mjs <slug> <title> [--no-theme-init]
import { writeFileSync } from 'node:fs';
const [slug, title, flag] = process.argv.slice(2);
const themeInit = flag === '--no-theme-init' ? '' : '\n    <script src="../theme-init.js"></script>';
const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${title} · LTC 초급</title>
    <meta name="theme-color" content="#111A2E">
    <link rel="manifest" href="../manifest.webmanifest">
    <link rel="icon" href="../icon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="../apple-touch-icon.png">${themeInit}
  </head>
  <body>
    <header class="topbar">
      <a href="../" class="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>활동 목록</a>
      <button type="button" data-theme-toggle></button>
    </header>
    <main id="app"></main>
    <script type="module" src="/src/pages/${slug}.ts"></script>
  </body>
</html>
`;
writeFileSync(`${slug}/index.html`, html);
