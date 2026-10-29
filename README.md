# LTC 초급 활동 (DK CCC)

CCC LTC 초급(2026-11-02·03) 학생 활동지. 학생이 QR로 접속해 폰으로 쓰는 정적 사이트.

- 서버·DB·분석 도구·외부 요청 없음. 입력 내용은 네트워크로 나가지 않는다 (CSP로 외부 출처 차단).
- 저장이 필요한 것만 그 폰의 localStorage에. `/confess/`는 어떤 저장도 하지 않는다.
- 예외: 3분 간증문은 [제출하기]를 누를 때만 간사님 Google 시트로 보낸다 (11/9까지). 간사용 페이지(`/staff/`)의 암호는 Google 서버가 확인한다. 설정: `docs/apps-script/README.md`
- 활동 문구 출처: `src/content.ts` 주석.

## 명령
```bash
npm ci
npm run dev        # 개발 서버
npm run build      # QR 생성 + 타입 검사 + 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기 (localhost:4173)
npm run shoot      # 360/390/430 · 라이트/다크 스크린샷 (shots/)
npm run check      # 동작 검증 (네트워크 0건, /confess, 불러오기, 오프라인 등)
```
`shoot`·`check`는 Playwright가 설치된 환경에서 미리보기 서버를 띄운 뒤 실행한다.

## 배포
GitHub Pages (`.github/workflows/deploy.yml`). 배포 주소가 바뀌면 `SITE_URL`·`SITE_BASE`를 바꿔 다시 빌드하면 QR도 새로 만들어진다.

실제 폰 테스트 방법: `docs/phone-test.md`
