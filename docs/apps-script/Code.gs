/**
 * LTC 초급 3분 간증문 — 제출 받기 / 간사용 조회.
 * 이 코드는 간증문을 모을 Google 시트의 [확장 프로그램 → Apps Script]에 붙여 넣는다.
 * 암호는 코드에 쓰지 않는다: [프로젝트 설정 → 스크립트 속성]에 STAFF_PASSWORD를 넣는다.
 * 배포: [배포 → 새 배포 → 웹 앱], 실행 사용자 "나", 액세스 권한 "모든 사용자".
 */

var SHEET_NAME = '간증문';
var DEADLINE = new Date('2026-11-09T23:59:59+09:00');
var MAX_NAME = 40;
var MAX_ANSWER = 5000;
var MAX_FAILS = 10; // 틀린 암호가 10분 안에 10번이면 10분 잠금

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad_request' });
  }
  if (req.action === 'submit') return submit(req);
  if (req.action === 'list') return list(req);
  return json({ ok: false, error: 'unknown_action' });
}

function doGet() {
  return json({ ok: true, service: 'ltc-testimony' });
}

function submit(req) {
  if (new Date() > DEADLINE) return json({ ok: false, error: 'closed' });
  var name = clip(req.name, MAX_NAME);
  var answers = [0, 1, 2].map(function (i) {
    return clip((req.answers || [])[i], MAX_ANSWER);
  });
  if (!name || answers.join('') === '') return json({ ok: false, error: 'empty' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet().appendRow([new Date(), safe(name), safe(answers[0]), safe(answers[1]), safe(answers[2])]);
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

function list(req) {
  var check = checkPassword(req.password);
  if (check !== 'ok') return json({ ok: false, error: check });
  var values = sheet().getDataRange().getValues().slice(1);
  var rows = values.map(function (v) {
    return {
      at: v[0] instanceof Date ? v[0].toISOString() : String(v[0]),
      name: unsafe(v[1]),
      answers: [unsafe(v[2]), unsafe(v[3]), unsafe(v[4])],
    };
  });
  return json({ ok: true, rows: rows });
}

function checkPassword(pw) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('fails') || 0);
  if (fails >= MAX_FAILS) return 'locked';
  var real = PropertiesService.getScriptProperties().getProperty('STAFF_PASSWORD');
  if (real && String(pw || '') === real) return 'ok';
  cache.put('fails', String(fails + 1), 600);
  return 'wrong';
}

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['제출 시각', '이름', '1. 영접 전의 삶', '2. 영접하게 된 계기', '3. 영접 후의 변화']);
    sh.setFrozenRows(1);
  }
  return sh;
}

// 시트가 글을 수식으로 읽지 않도록 = + - @ 로 시작하면 앞에 ' 를 붙인다.
function safe(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function unsafe(v) {
  return String(v == null ? '' : v);
}
function clip(x, n) {
  return String(x == null ? '' : x).trim().slice(0, n);
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
