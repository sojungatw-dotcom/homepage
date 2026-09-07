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

1. `YOUR NAME`, 소개 문구, 연도 등을 실제 정보로 변경합니다.
2. 이미지 파일은 `assets/images/` 하위의 페이지별 폴더에 저장합니다.
3. CSS 플레이스홀더를 이미지로 교체할 때 해당 요소에 `background-image: url(...)`, `background-size: cover`, `background-position: center`를 적용합니다.
4. SNS의 숫자는 `sns.html` 내 `data-count` 값을 수정하면 자동으로 애니메이션됩니다.
5. 콘텐츠 카드는 `data-category="card"` 또는 `data-category="video"`를 유지하면 필터가 동작합니다.

외부 라이브러리 없이 HTML, CSS, JavaScript만으로 실행되며 `index.html`을 브라우저에서 열면 됩니다.
