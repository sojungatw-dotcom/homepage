# Journey Archive

SK플래닛 관광 콘텐츠 제작 활동의 조사, 콘텐츠, SNS 데이터, 최종 프로젝트를 정리하는 반응형 정적 웹사이트입니다.

## 페이지

- `index.html`: 소개 및 메인 랜딩
- `report.html`: 관광 자원 조사표와 기획 노트
- `contents.html`: 카드뉴스·영상 콘텐츠 필터형 갤러리
- `sns.html`: SNS 성과 대시보드
- `final.html`: 최종 팀 프로젝트 소개
- `cardnews.html`: 글을 카드 덱으로 구성하고 편집·내보내기 하는 카드뉴스 스튜디오

## 콘텐츠 교체

1. 공개 운영자명은 확인된 이름만 사용합니다. 현재 푸터에는 개인 이름 대신 OVE 아카이브 명칭을 표시합니다.
2. 이미지 파일은 `assets/images/` 하위의 페이지별 폴더에 저장합니다.
3. CSS 플레이스홀더를 이미지로 교체할 때 해당 요소에 `background-image: url(...)`, `background-size: cover`, `background-position: center`를 적용합니다.
4. SNS의 숫자는 `sns.html` 내 `data-count` 값을 수정하면 자동으로 애니메이션됩니다.
5. 콘텐츠 카드는 `data-category="card"` 또는 `data-category="video"`를 유지하면 필터가 동작합니다.

외부 라이브러리 없이 HTML, CSS, JavaScript만으로 실행되며 `index.html`을 브라우저에서 열면 됩니다.

## 등록형 챗봇

8개 주요 페이지에 고정 채팅 버튼이 있습니다. 질문·답변·분기는 `data/chatbot.json`, Supabase 연결은 `data/chatbot-config.json`에서 관리합니다. [설정 방법과 준비할 답변 목록](docs/chatbot-setup.md)을 확인하세요. 생성형 AI는 사용하지 않습니다.

## 챗봇 관리자

`admin.html`에서 로그인 후 등록된 안내 편집, 초안 미리보기, 최종 게시, 게시 이력·복원과 문의 처리를 관리합니다. 실제 인증·저장·게시에는 Supabase 연결이 필요하며 현재 설정은 연결 전 상태입니다. [관리자 연결과 운영 안내](docs/admin-setup.md)를 확인하세요. 비밀번호나 서비스 비밀 키는 웹 코드에 저장하지 않습니다.


## 근처 주차장 (로컬 실행)

관광 자원 상세 팝업의 **근처 주차장** 탭에서 관광지 소재 구의 반경 3km 내 시설 정보를 직선거리순으로 조회합니다.
제공처: [한국교통안전공단 주차정보 제공 API](https://www.data.go.kr/data/15099883/openapi.do).
총 주차면 수는 실시간 빈자리 수가 아닙니다. 관광지 기준 좌표는 `server/parking.py`에서 관리합니다.

1. 공공데이터포털에서 위 API 활용신청을 승인받습니다.
2. 프로젝트 터미널에서 `./scripts/setup-parking-api.command`를 실행하고 일반 인증키(Decoding)를 입력합니다. 입력은 화면에 표시되지 않으며 `.env`에 권한 600으로 저장됩니다. 기존 다른 키는 보존합니다.
3. `./scripts/start-local.command`를 실행합니다 (Python 3 필요).
4. 브라우저에서 `http://127.0.0.1:8000/report.html`을 엽니다.

키 입력을 마친 후 Enter를 한 번 더 누르면 등록 스크립트가 종료됩니다. 서버 종료는 Ctrl+C입니다.
API 키는 서버에서만 읽으며 HTML·브라우저 요청·응답에 포함하지 않습니다.
`.env` 및 `.env.*`는 Git에서 제외하며 `.env.example`에는 빈 변수명만 둡니다.
로컬 서버는 비공개 파일과 서버 소스의 HTTP 접근을 차단합니다. `.env`가 있는 프로젝트 루트를 일반 정적 서버로 공개하지 마세요.

정적 호스팅만으로는 이 API 기능을 실행할 수 없습니다. Vercel에서는 아래 Python Function을 함께 배포합니다.
관광지가 속한 남구·금정구·영도구 시설 정보를 구별로 조회하고 서버 메모리에 1시간 캐시합니다. 페이지 요청 실패 시 일부 데이터만 표시하지 않고 재시도를 안내합니다.


## Vercel 배포

`api/parking.py`가 `/api/parking` 요청을 처리하고, 기존 주차장 조회 코드를 재사용합니다.
`vercel.json`은 공개 파일만 `public/`에 모아 배포하며 `.env`, 서버 코드, 등록 스크립트는 정적 웹 파일에 포함하지 않습니다.

1. 프로젝트를 GitHub 저장소에 올린 뒤 Vercel에서 **Add New → Project**로 가져옵니다.
2. **Root Directory**는 `vercel.json`이 있는 프로젝트 루트, **Framework Preset**은 **Other**로 선택합니다.
3. 빌드는 `vercel.json`의 `python3 scripts/build_vercel.py`, 출력 폴더는 `public`을 사용합니다. 별도 패키지 설치는 필요 없습니다.
4. Vercel 프로젝트 **Settings → Environment Variables**에서 이름 `PARKING_API_KEY`, 값은 공공데이터포털의 Decoding 인증키로 등록합니다. **Production**을 선택하고 미리보기에서도 사용하려면 **Preview**에도 등록합니다. 이름에 `NEXT_PUBLIC_` 또는 `VITE_`를 붙이지 않습니다.
5. **Deploy**를 실행합니다. 이미 배포했다면 환경 변수 저장 후 **Redeploy**합니다.
6. 배포 URL의 `/report.html`에서 관광지 상세 → 근처 주차장을 확인합니다.

`.env`는 로컬 전용입니다. Vercel에 업로드하거나 Git에 커밋하지 않습니다.
Vercel에서는 환경 변수만 읽으며 `.env`로 대체하지 않습니다. 함수 인스턴스 재시작 시 메모리 캐시는 초기화됩니다.
로컬 배포 파일 점검: `python3 scripts/build_vercel.py`.

공식 문서: [Python Functions](https://vercel.com/docs/functions/runtimes/python/api-directory), [Vercel 설정](https://vercel.com/docs/project-configuration/vercel-json).
