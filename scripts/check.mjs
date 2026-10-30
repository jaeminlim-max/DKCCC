// 동작 검증. 미리 `npm run build && npm run preview`.
// 1) 외부 네트워크 요청 0건  2) /confess 흐름·초기화·저장 없음  3) 기도 명단 → 결단 카드 불러오기
// 4) 카드 이미지 생성  5) 저장이 막힌 환경에서도 동작
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const ORIGIN = new URL(BASE).origin;
const OUT = 'shots/check';
mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const GAS = process.env.GAS ?? ''; // 간증문 서버 주소 (테스트에서는 scripts/mock-gas.mjs)
const browser = await chromium.launch();
const external = [];
const gasCalls = []; // { page, action }
async function newContext(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, ...opts });
  ctx.on('request', (r) => {
    const u = r.url();
    if (GAS && u.startsWith(GAS)) {
      let action = '?';
      try {
        action = JSON.parse(r.postData() ?? '{}').action;
      } catch {}
      gasCalls.push({ page: r.frame().url(), action });
      return;
    }
    if (!u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
  });
  return ctx;
}

async function storageSnapshot(page) {
  return page.evaluate(async () => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    cookie: document.cookie,
    idb: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [],
  }));
}

/* ── /confess ───────────────────────────────────────── */
{
  const ctx = await newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.clock.install();
  await page.goto(BASE + 'confess/');
  const before = await storageSnapshot(page);
  await page.getByRole('checkbox', { name: /어두운 종이/ }).check();
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.screenshot({ path: `${OUT}/confess-1-pray.png` });
  ok('❶ 30초 기도 화면', await page.getByText('성령께 당신의 죄를 깨닫게').isVisible());
  await page.clock.runFor(15000);
  await page.screenshot({ path: `${OUT}/confess-1-pray-mid.png` });
  await page.clock.runFor(16000);
  const ta = page.locator('textarea');
  ok('30초 후 자동으로 ❷', await ta.isVisible());
  const attrs = await ta.evaluate((t) => ['autocomplete', 'autocorrect', 'autocapitalize', 'spellcheck'].map((a) => `${a}=${t.getAttribute(a)}`).join(' '));
  ok('입력칸 속성', attrs === 'autocomplete=off autocorrect=off autocapitalize=off spellcheck=false', attrs);
  const done = page.getByRole('button', { name: '작성 완료' });
  ok('비어 있으면 [작성 완료] 비활성', await done.isDisabled());
  await ta.fill('테스트 문장 하나\n두 번째 줄');
  ok('입력하면 [작성 완료] 활성', await done.isEnabled());
  await page.screenshot({ path: `${OUT}/confess-2-write.png` });
  await done.click();
  ok('[작성 완료] 후 입력칸 잠김(없어짐)', (await page.locator('textarea').count()) === 0);
  await page.clock.runFor(1200);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/confess-3-cover-mid.png` });
  await page.clock.runFor(3000);
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/confess-3-cover.png` });
  const hint = page.getByText('눌러서 찢으세요');
  ok('❹ 터치 유도 표시', await hint.isVisible());
  await page.screenshot({ path: `${OUT}/confess-4-hint.png` });
  const card = page.locator('.paper');
  await card.click();
  await page.waitForTimeout(150);
  ok('한 번 누르면 찢김선, 유도 사라짐', (await page.locator('.crack').count()) === 1 && (await hint.count()) === 0);
  await page.screenshot({ path: `${OUT}/confess-4-tap1.png` });
  await page.clock.runFor(450);
  await page.waitForTimeout(200);
  ok('더 누르지 않아도 두 조각', (await page.locator('.piece').count()) === 2);
  await page.screenshot({ path: `${OUT}/confess-4-tap2.png` });
  await page.clock.runFor(550);
  await page.waitForTimeout(300);
  ok('이어서 여러 조각 + 가루', (await page.locator('.piece').count()) === 6 && (await page.locator('canvas.dust').count()) === 1);
  await page.clock.runFor(600);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/confess-4-tap3.png` });
  await page.clock.runFor(3000);
  await page.waitForTimeout(300);
  const html = await page.content();
  ok('다 찢은 뒤 입력 내용이 DOM에 없음', !html.includes('테스트 문장') && (await page.locator('.piece').count()) === 0);
  ok('끝 화면 표시', await page.getByText('당신의 모든 죄를 용서해 주신 하나님께 감사하라.').isVisible());
  await page.screenshot({ path: `${OUT}/confess-5-end.png`, fullPage: true });
  const after = await storageSnapshot(page);
  ok('저장소 변화 없음 (local/session/cookie/IndexedDB)', JSON.stringify(before) === JSON.stringify(after) && after.local.length === 0 && after.session.length === 0 && after.cookie === '' && after.idb.length === 0, JSON.stringify(after));

  // 새로고침
  await page.goto(BASE + 'confess/');
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.clock.runFor(31000);
  await page.locator('textarea').fill('새로고침 테스트');
  await page.reload();
  ok('새로고침 후 빈 화면에서 시작', (await page.getByRole('button', { name: '시작하기' }).isVisible()) && !(await page.content()).includes('새로고침 테스트'));

  // 뒤로가기 (다른 페이지 갔다가 돌아오기)
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.clock.runFor(31000);
  await page.locator('textarea').fill('뒤로가기 테스트');
  await page.goto(BASE);
  await page.goBack();
  await page.waitForTimeout(300);
  ok('뒤로가기 후 빈 화면에서 시작', (await page.getByRole('button', { name: '시작하기' }).isVisible()) && !(await page.content()).includes('뒤로가기 테스트'));

  // 화면 가려짐 (알림센터·제어센터·앱 전환): 가림막, 60초 안이면 유지, 넘으면 처음부터
  const hide = () =>
    page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  const show = () =>
    page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.clock.runFor(31000);
  await page.locator('textarea').fill('알림센터 테스트');
  await hide();
  ok('가려지면 가림막이 덮음', await page.locator('.veil').isVisible());
  await page.clock.runFor(10000);
  await show();
  ok('10초 뒤 돌아오면 쓰던 내용 유지', (await page.locator('.veil').count()) === 0 && (await page.locator('textarea').inputValue()) === '알림센터 테스트');
  await hide();
  await page.clock.runFor(61000);
  await show();
  ok('60초 넘게 비우면 처음부터', (await page.getByRole('button', { name: '시작하기' }).isVisible()) && !(await page.content()).includes('알림센터 테스트'));
  // 손글씨 모드: 쓰기 → 완료 → 덮기 → 세 번 찢기 → 끝, 저장 없음
  await page.goto(BASE + 'confess/');
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.clock.runFor(31000);
  await page.getByRole('button', { name: '손글씨' }).click();
  const hc = await page.locator('.hand-canvas').boundingBox();
  await page.mouse.move(hc.x + 30, hc.y + 40);
  await page.mouse.down();
  for (let i = 0; i < 20; i++) await page.mouse.move(hc.x + 30 + i * 6, hc.y + 40 + Math.sin(i) * 8);
  await page.mouse.up();
  ok('손글씨: 쓰면 [작성 완료] 활성', await page.getByRole('button', { name: '작성 완료' }).isEnabled());
  await page.getByRole('button', { name: '작성 완료' }).click();
  await page.clock.runFor(5000);
  await page.waitForTimeout(3000);
  ok('손글씨: 잠기고 구절이 덮음', (await page.locator('.verse-cover').count()) === 1 && (await page.locator('.hand-canvas.ink-layer').count()) === 1);
  await page.locator('.paper').click();
  await page.clock.runFor(450);
  await page.waitForTimeout(200);
  ok('손글씨: 찢긴 두 조각에도 글씨가 보임', (await page.locator('.piece canvas').count()) === 2);
  await page.clock.runFor(4000);
  await page.waitForTimeout(300);
  ok('손글씨: 끝 화면, 캔버스 모두 비움', (await page.getByText('당신의 모든 죄를 용서해 주신 하나님께 감사하라.').isVisible()) && (await page.locator('canvas').count()) === 0);
  const final = await storageSnapshot(page);
  ok('/confess 전체 과정 후에도 저장소 비어 있음', final.local.length === 0 && final.session.length === 0 && final.cookie === '' && final.idb.length === 0, JSON.stringify(final));
  await ctx.close();
}

/* ── 기도 명단 → 결단 카드 ───────────────────────────── */
{
  const ctx = await newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + 'prayer-list/');
  const input = page.getByRole('textbox', { name: '기도할 사람 이름' });
  for (const n of ['김민수', '박지은', 'Nguyen Van An']) {
    await input.fill(n);
    await page.getByRole('button', { name: '추가', exact: true }).click();
  }
  ok('기도 명단 3명 추가', (await page.locator('.name-list li').count()) === 3);
  ok('기도 명단 하단 문구', await page.getByText('이 카드는 폰에 저장돼요. 오늘 마지막 시간에 다시 엽니다. 같은 폰으로 열어야 다시 불러올 수 있어요.').isVisible());
  await page.reload();
  ok('새로고침 후 명단 유지', (await page.locator('.name-list li').count()) === 3);
  await page.getByRole('button', { name: '카드 이미지 저장' }).click();
  const img = page.locator('dialog.sheet img');
  await img.waitFor();
  const size = await img.evaluate((i) => new Promise((r) => (i.complete ? r([i.naturalWidth, i.naturalHeight]) : (i.onload = () => r([i.naturalWidth, i.naturalHeight])))));
  ok('기도 명단 카드 이미지 1080×1350', size[0] === 1080 && size[1] === 1350, size.join('×'));
  await page.screenshot({ path: `${OUT}/prayer-sheet.png` });
  await page.getByRole('button', { name: '닫기' }).click();

  await page.goto(BASE + 'pledge/');
  await page.getByRole('button', { name: '기도 명단에서 불러오기' }).click();
  ok('결단 카드에서 기도 명단 보임', (await page.locator('.chip').count()) === 3);
  await page.locator('.chip', { hasText: '박지은' }).click();
  ok('누르면 칸 1에 들어감', (await page.locator('#box1 .name-list li').allTextContents()).some((t) => t.includes('박지은')));
  await page.getByRole('button', { name: /하나님, 보여 주세요/ }).click();
  ok('칸 1 안내 문구', await page.getByText('한 명을 떠올려 보세요.').isVisible());
  ok('"하나님, 보여 주세요" 채워짐', (await page.locator('#grow').inputValue()) === '하나님, 보여 주세요');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '다음' }).click();
  ok('헌신 기도 마지막 문장', (await page.locator('#slide').textContent()) === '예수님의 이름으로 기도합니다. 아멘.');
  await page.screenshot({ path: `${OUT}/pledge-filled.png`, fullPage: true });
  await page.getByRole('button', { name: '카드 이미지 저장' }).click();
  await page.locator('dialog.sheet img').waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/pledge-sheet.png` });
  await page.getByRole('button', { name: '닫기' }).click();
  await page.reload();
  ok('결단 카드 새로고침 후 유지', (await page.locator('#grow').inputValue()) === '하나님, 보여 주세요');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '이 폰에서 지우기' }).click();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  ok('결단 카드 "이 폰에서 지우기"', !keys.includes('ltc:pledge'), keys.join(','));

  /* 과제 */
  await page.goto(BASE + 'homework/');
  await page.locator('#read').check();
  await page.getByRole('tab', { name: /3분 간증문/ }).click();
  await page.locator('#a0').fill('영접 전 이야기');
  await page.waitForTimeout(700);
  await page.reload();
  ok('과제: 탭·간증문 저장 유지', (await page.locator('#a0').inputValue()) === '영접 전 이야기');
  await page.screenshot({ path: `${OUT}/homework-2.png`, fullPage: true });

  await ctx.close();
}

/* ── 반응대처법 도표 · 간사용 암호 ───────────────────── */
{
  const ctx = await newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + 'response-chart/');
  await page.getByRole('button', { name: '오른쪽' }).click();
  await page.getByRole('button', { name: '없다' }).click();
  await page.getByRole('button', { name: '세 번째 질문으로' }).click();
  await page.getByRole('button', { name: '마음에 안 든다' }).click();
  await page.getByRole('button', { name: '아니오' }).click();
  ok('도표: Q1 오른쪽 → 없다 → Q3 → 안 든다 → 아니오 끝까지', await page.locator('#flow').getByText('사영리를 선물로 드릴 테니').isVisible());
  await page.screenshot({ path: `${OUT}/chart-flow.png`, fullPage: true });
  await page.getByRole('button', { name: '한 단계 뒤로' }).click();
  ok('도표: 한 단계 뒤로', await page.locator('#flow').getByRole('button', { name: '아니오' }).isVisible());
  await page.getByRole('tab', { name: '전체 도표' }).click();
  ok('도표: 전체 보기에 Q1·Q2·Q3', (await page.locator('.tq h2').allTextContents()).join() === 'Q1,Q2,Q3');
  await page.screenshot({ path: `${OUT}/chart-all.png`, fullPage: true });

  /* 간증문 제출 → 간사용 조회 */
  if (GAS) {
    await page.goto(BASE + 'homework/');
    await page.getByRole('tab', { name: /3분 간증문/ }).click();
    const before = gasCalls.length;
    await page.locator('#name').fill('홍길동');
    await page.locator('#a0').fill('=SUM(1,1) 영접 전 이야기');
    await page.locator('#a2').fill('영접 후 이야기');
    await page.waitForTimeout(700);
    ok('제출 전에는 서버 요청 없음', gasCalls.length === before);
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: '제출하기' }).click();
    await page.getByText(/제출했어요 ·/).waitFor({ timeout: 5000 });
    ok('간증문 제출 성공 표시', await page.getByText(/제출했어요 ·/).isVisible());
    await page.screenshot({ path: `${OUT}/homework-submitted.png`, fullPage: true });

    await page.goto(BASE + 'staff/');
    ok('간사용: 암호 화면 (목록·QR 숨김)', (await page.locator('#pw').isVisible()) && (await page.locator('.qr-item, .titem').count()) === 0);
    await page.locator('#pw').fill('000000');
    await page.getByRole('button', { name: '열기' }).click();
    await page.getByText('암호가 맞지 않습니다.').waitFor({ timeout: 5000 });
    ok('간사용: 틀린 암호는 서버가 거절', (await page.locator('.titem, .qr-item').count()) === 0);
    await page.locator('#pw').fill('test-pw');
    await page.getByRole('button', { name: '열기' }).click();
    await page.locator('.titem').first().waitFor({ timeout: 5000 });
    ok('간사용: 맞는 암호로 간증문 목록', (await page.locator('.titem summary').first().textContent()).includes('홍길동'));
    await page.locator('.titem summary').first().click();
    await page.screenshot({ path: `${OUT}/staff-list.png`, fullPage: true });
    await page.getByRole('tab', { name: 'QR 모음' }).click();
    await page.locator('.qr-item').first().waitFor();
    ok('간사용: QR 6개', (await page.locator('.qr-item').count()) === 6);
    const html = await page.content();
    ok('간사용: 페이지 코드에 암호 없음', !html.includes('test-pw') || (await page.locator('#pw').count()) === 0);
    await page.reload();
    ok('간사용: 새로고침하면 다시 암호를 물음', await page.locator('#pw').isVisible());
    ok('서버 요청은 /homework 제출과 /staff 조회뿐', gasCalls.every((c) => (c.page.includes('/homework/') && c.action === 'submit') || (c.page.includes('/staff/') && c.action === 'list')), JSON.stringify(gasCalls));
  }
  await ctx.close();
}

/* ── 저장이 막힌 환경 ───────────────────────────────── */
{
  const ctx = await newContext();
  await ctx.addInitScript(() => {
    const deny = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    Storage.prototype.setItem = deny;
    Storage.prototype.getItem = deny;
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const p of ['', 'confess/', 'homework/', 'prayer-list/', 'response-chart/', 'pledge/', 'staff/']) {
    await page.goto(BASE + p);
    await page.waitForTimeout(200);
  }
  await page.goto(BASE + 'prayer-list/');
  await page.getByRole('textbox', { name: '기도할 사람 이름' }).fill('테스트');
  await page.getByRole('button', { name: '추가', exact: true }).click();
  ok('저장 불가 환경: 오류 없이 동작', errors.length === 0 && (await page.locator('.name-list li').count()) === 1, errors.join(' | '));
  ok('저장 불가 환경: 안내 문구', await page.locator('.storage-warning').isVisible());
  await page.screenshot({ path: `${OUT}/no-storage.png`, fullPage: true });
  await ctx.close();
}

/* ── 오프라인 (한 번 연 뒤) ─────────────────────────── */
{
  const ctx = await newContext();
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await ctx.setOffline(true);
  const failed = [];
  for (const p of ['', 'confess/', 'homework/', 'prayer-list/', 'response-chart/', 'pledge/', 'staff/']) {
    try {
      await page.goto(BASE + p);
      await page.locator('h1').first().waitFor({ timeout: 3000 });
    } catch {
      failed.push(p || '/');
    }
  }
  ok('오프라인: 홈을 한 번 연 뒤 모든 페이지 열림', failed.length === 0, failed.join(', '));
  await ctx.close();
}

ok('외부 네트워크 요청 0건', external.length === 0, external.slice(0, 5).join(', '));
await browser.close();
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} 통과`);
process.exit(failed ? 1 : 0);
