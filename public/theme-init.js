// 첫 그리기 전에 저장된 테마를 적용한다 (/confess에서는 불러오지 않음).
try {
  var t = JSON.parse(localStorage.getItem('ltc:theme') || 'null');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
