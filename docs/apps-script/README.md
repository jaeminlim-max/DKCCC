# 간증문 서버 설정 (간사님이 한 번만)

간증문은 Google 시트 **「LTC초급 3분 간증문 제출 (2026)」**(간사님 Drive)에 모입니다.
사이트와 시트를 잇는 것이 이 폴더의 `Code.gs`(Apps Script 웹 앱)입니다.

## 1. 코드 붙여 넣기
1. 시트를 엽니다 → 메뉴 **확장 프로그램 → Apps Script**.
2. 처음 있는 `Code.gs` 내용을 모두 지우고, 이 폴더의 `Code.gs` 내용을 붙여 넣고 저장(💾)합니다.

## 2. 암호 넣기 (코드에는 쓰지 않습니다)
1. 왼쪽 ⚙ **프로젝트 설정** → 맨 아래 **스크립트 속성** → **스크립트 속성 추가**.
2. 속성: `STAFF_PASSWORD` / 값: 간사용 암호 → **저장**.

## 3. 웹 앱으로 배포
1. 오른쪽 위 **배포 → 새 배포** → 유형 ⚙ **웹 앱**.
2. 실행 사용자: **나** / 액세스 권한이 있는 사용자: **모든 사용자**.
3. **배포** → 권한 승인(“확인되지 않은 앱” 화면이 나오면 *고급 → 이동*) → 나오는 **웹 앱 URL**(`https://script.google.com/macros/s/…/exec`)을 복사합니다.
   - "모든 사용자"가 목록에 없으면 kccc.org 조직 정책이 막은 것입니다. 개인 Gmail 계정으로 시트와 스크립트를 만들어야 합니다.

## 4. 사이트에 주소 연결
저장소 **Settings → Secrets and variables → Actions → Variables → New repository variable**
- 이름 `GAS_URL`, 값: 위 웹 앱 URL → 저장 → **Actions → Deploy to GitHub Pages → Run workflow**.
(현재는 `.github/workflows/deploy.yml`에 웹 앱 URL이 기본값으로 들어 있습니다. 새로 배포해서 URL이 바뀌면 그 줄을 고치거나 위 변수를 만드세요.)

## 코드를 고친 뒤에는
**배포 → 배포 관리 → ✏ → 버전: 새 버전 → 배포**. 그래야 같은 URL에 반영됩니다.
