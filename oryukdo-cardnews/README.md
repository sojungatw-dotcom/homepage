# 오륙도 스카이워크 모션 카드뉴스

`motion-cardnews` 스킬 규칙에 맞춰 제작한 4:5 카드뉴스 5장입니다. 모든 문구와 모션은 HTML/CSS/JS에서 편집할 수 있으며 카드별 URL과 정지 화면 모드를 제공합니다.

## 미리보기

- 전체 보기: `index.html`
- 개별 카드: `index.html?card=1`부터 `index.html?card=5`
- 최종 프레임: `index.html?card=1&static=1`

로컬 서버 실행:

```bash
python3 -m http.server 8080 --directory oryukdo-cardnews
```

그다음 `http://localhost:8080/?card=1`을 엽니다.

PNG 다시 내보내기(Playwright 설치 환경):

```bash
NODE_PATH=/path/to/node_modules node export-png.cjs
```

## 편집 위치

- 문구/구조: `index.html`
- 색상/레이아웃/모션: `styles.css`
- 카드 선택/재생: `motion.js`
- 생성 이미지: `assets/oryukdo-hero.png`
- 카드별 PNG: `exports/01.png` ~ `exports/05.png`
- 통합 MP4: `oryukdo-skywalk-cardnews.mp4` (1080×1350, 24fps, 약 20초)

## MP4 다시 만들기

`render-video-frames.cjs`가 브라우저 모션을 프레임으로 렌더링하고, `encode-video.swift`가 H.264 MP4로 인코딩합니다. 카드당 4초, 전환 0.35초로 설정되어 있습니다.

## 콘텐츠 출처

- 한국관광공사 VISITKOREA, 오륙도 스카이워크: 구조·주소·요금·운영시간
- 부산관광포털 Visit Busan: 대중교통·관람 에티켓·기상에 따른 개방 제한

운영 정보는 변동될 수 있으므로 게시 전 공식 홈페이지에서 한 번 더 확인하세요.

## 이미지 생성 기록

내장 이미지 생성 도구를 사용했습니다. 프롬프트 요약: “부산 오륙도 스카이워크에서 영감을 받은 4:5 세로형 사실적 관광 에디토리얼 사진, 코발트빛 바다·해안 절벽·말발굽형 유리 전망대, 좌상단 타이포그래피 여백, 텍스트·로고·워터마크 없음.”
