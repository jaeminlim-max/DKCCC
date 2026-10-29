// 홈 목록과 QR 모음이 함께 쓰는 페이지 목록. path는 사이트 기준 상대 경로.
export interface Route {
  path: string;
  title: string;
  day: 'mon' | 'tue' | 'staff';
  time?: string;
  where: string;
  ready: boolean;
}

export const ROUTES: Route[] = [
  { path: 'circles/', title: '세 원 그리기', day: 'mon', time: '18:20', where: '강의 1 · 짝 활동', ready: true },
  { path: 'confess/', title: '죄 목록', day: 'mon', time: '18:20', where: '강의 1 · 적용', ready: true },
  { path: 'sentence/', title: '문장 하나 들고 가기', day: 'mon', time: '19:25', where: '강의 3 · 믿음으로 살라', ready: true },
  { path: 'homework/', title: '과제', day: 'mon', time: '20:10', where: '사영리 첫 연습 · 사영리 읽어 주기, 3분 간증문', ready: true },
  { path: 'prayer-list/', title: '기도 명단 카드', day: 'tue', time: '18:20', where: '강의 4 · 5. 기도하라', ready: true },
  { path: 'response-chart/', title: '반응대처법 도표', day: 'tue', time: '19:15', where: '반응 대처', ready: false },
  { path: 'pledge/', title: '결단 카드', day: 'tue', time: '19:40', where: '강의 5 · 6. 결단', ready: true },
];
