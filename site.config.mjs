// 배포 주소. 정해지면 SITE_URL 환경변수나 여기 기본값을 바꾸고 다시 빌드하면 QR이 새로 만들어진다.
export const SITE_URL = (process.env.SITE_URL ?? 'http://localhost:4173/').replace(/\/?$/, '/');
