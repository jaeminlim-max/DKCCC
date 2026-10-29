// 카드 이미지 저장. 캔버스 → PNG → 미리보기 시트.
// iPhone은 공유 시트의 "이미지 저장"으로 사진 앱에 들어가므로 공유를 먼저 보여 준다.
// 저장 버튼은 시트 안에서 새로 누르게 해서, 브라우저의 "사용자 동작" 제한에 걸리지 않게 한다.
import { h } from './dom';

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

export async function openImageSheet(canvas: HTMLCanvasElement, filename: string, title: string): Promise<void> {
  const blob = await toBlob(canvas);
  const url = URL.createObjectURL(blob);
  const file = new File([blob], filename, { type: 'image/png' });
  const canShareFile = (() => {
    try {
      return !!navigator.canShare && navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  })();

  const img = h('img', { src: url, alt: title + ' 미리보기' });
  const shareBtn = h('button', { class: 'btn btn-primary', type: 'button', text: '사진에 저장 / 공유' });
  const dl = h('a', { class: 'btn' + (canShareFile ? '' : ' btn-primary'), href: url, download: filename, text: '파일로 내려받기' });
  const close = h('button', { class: 'btn btn-quiet', type: 'button', text: '닫기' });
  const tip = h('p', { class: 'note', text: '저장이 안 되면 이미지를 길게 눌러 "사진에 저장"을 고르세요.' });
  const body = h('div', { class: 'stack' }, h('h2', { text: title }), img);
  if (canShareFile) body.append(shareBtn);
  body.append(dl, tip, close);
  const dialog = h('dialog', { class: 'sheet', 'aria-label': title }, body);
  document.body.append(dialog);

  shareBtn.addEventListener('click', async () => {
    try {
      await navigator.share({ files: [file], title });
    } catch {
      /* 취소 또는 실패: 내려받기 버튼이 남아 있다 */
    }
  });
  const cleanup = () => {
    URL.revokeObjectURL(url);
    dialog.remove();
  };
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', cleanup);
  dialog.showModal();
}
