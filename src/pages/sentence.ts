// 문장 하나 들고 가기 — 강의 3 4번. 영역 한 단어(선택)는 이 폰에만 저장.
import { initPage } from '../lib/page';
import { $, debounce, toast } from '../lib/dom';
import { load, remove, save, warnIfNoStorage } from '../lib/storage';
import { openImageSheet } from '../lib/image-save';
import { drawWrapped, ensureFont, font, makeCanvas } from '../lib/canvas-text';
import { SENTENCE } from '../content';
import '../styles/sentence.css';

initPage();

const KEY = 'sentence';
interface Data {
  word: string;
  withWord: boolean;
}
const data = load<Data>(KEY, { word: '', withWord: false });

const app = $('#app');
app.innerHTML = `
  <div class="page-head">
    <h1 class="visually-hidden">${SENTENCE.title}</h1>
    <p class="where">${SENTENCE.title} · ${SENTENCE.where}</p>
  </div>
  <p class="big-sentence" id="sentence"></p>
  <div class="section stack" id="form">
    <label class="field">
      <span>떠올린 영역 (선택)</span>
      <span class="hint">한 단어로 적어 두세요. 이 폰에만 저장됩니다.</span>
      <input type="text" id="word" maxlength="20" autocomplete="off" enterkeyhint="done">
    </label>
    <p class="save-state" id="state" aria-live="polite"></p>
    <label class="check"><input type="checkbox" id="with-word"> 잠금화면 이미지에도 넣기</label>
    <p class="note">잠금화면은 다른 사람도 볼 수 있어요. 넣지 않으면 문장만 들어갑니다.</p>
    <button type="button" class="btn btn-quiet btn-danger" id="clear">이 폰에서 지우기</button>
  </div>
  <div class="bottom-bar"><div class="inner">
    <button type="button" class="btn btn-primary" id="save">잠금화면 이미지 저장</button>
  </div></div>
`;
$('#sentence').textContent = SENTENCE.text;
warnIfNoStorage($('#form'));

const word = $<HTMLInputElement>('#word');
const withWord = $<HTMLInputElement>('#with-word');
word.value = data.word;
withWord.checked = data.withWord;

const persist = debounce(() => {
  save(KEY, { word: word.value.trim(), withWord: withWord.checked });
  $('#state').textContent = word.value.trim() ? '이 폰에 저장됨' : '';
}, 400);
word.addEventListener('input', persist);
withWord.addEventListener('change', persist);
if (data.word) $('#state').textContent = '이 폰에 저장됨';

$('#clear').addEventListener('click', () => {
  if (!window.confirm('적은 영역을 이 폰에서 지울까요?')) return;
  remove(KEY);
  word.value = '';
  withWord.checked = false;
  $('#state').textContent = '';
  toast('지웠어요');
});

$('#save').addEventListener('click', async () => {
  const area = withWord.checked ? word.value.trim() : '';
  await ensureFont([SENTENCE.text, area], [500, 800]);
  const W = 1080;
  const H = 1920;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#111A2E';
  ctx.fillRect(0, 0, W, H);
  // 시계·알림을 피해 화면 가운데 아래쪽에 둔다
  const x = 112;
  let y = 1040;
  ctx.fillStyle = '#F28C38';
  ctx.fillRect(x, y - 150, 96, 10);
  if (area) {
    ctx.font = font(500, 46);
    ctx.fillStyle = '#B9C3DA';
    ctx.fillText(area, x, y - 60);
  }
  ctx.font = font(800, 104);
  ctx.fillStyle = '#F6F3EC';
  y = drawWrapped(ctx, SENTENCE.text, x, y + 40, W - x * 2, 148);
  void openImageSheet(c, 'ltc-문장.png', '잠금화면 이미지');
});
