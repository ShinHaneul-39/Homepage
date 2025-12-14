# Shin Haneul's Homepage

신하늘의 개인 포트폴리오 및 프로필 사이트입니다. Discord 관리자 경력, 블로그 포스트, 그리고 소소한 일상을 담고 있습니다.

## 📁 프로젝트 구조 (Project Structure)

프로젝트는 기능과 목적에 따라 다음과 같이 구성되어 있습니다.

```
/
├── assets/                  # 정적 자원 (CSS, JS, Images, Data)
│   ├── css/                 # 스타일시트 (.css)
│   ├── data/                # 데이터 파일 (.csv)
│   ├── images/              # 이미지 리소스
│   └── js/                  # 프론트엔드 스크립트
├── scripts/                 # 빌드 및 유틸리티 스크립트 (Node.js)
│   ├── utils/               # 스크립트 공용 유틸리티
│   └── extract.js           # 데이터 추출 스크립트
├── __tests__/               # 테스트 코드
├── archive/                 # 보관된 레거시 파일
├── posts/                   # 블로그 포스트 HTML 파일
├── index.html               # 메인 페이지
├── career-table.html        # Discord 관리자 경력 페이지
├── special-thanks.html      # 고마운 사람들 페이지
├── blog.html                # 블로그 목록 페이지
└── package.json             # 프로젝트 의존성 설정
```

## 📏 명명 규칙 (Naming Conventions)

프로젝트의 일관성을 유지하기 위해 다음 규칙을 준수합니다.

### 1. 디렉토리 (Directories)
- **규칙**: 소문자와 하이픈(`-`)만 사용합니다.
- **예시**: `assets/images`, `scripts/utils`

### 2. 파일 (Files)
- **규칙**: 소문자와 하이픈(`-`) 또는 밑줄(`_`)을 사용합니다.
  - HTML/JS/CSS: 케밥 케이스(`kebab-case`) 권장 (예: `career-table.html`, `data-manager.js`)
  - 테스트 파일: `대상파일명.test.js` 형식 (예: `data-manager.test.js`)
- **확장자**: 파일의 종류에 맞는 정확한 확장자를 사용합니다 (`.html`, `.js`, `.css`, `.csv`).

### 3. 코드 일관성 (Consistency)
- 동일한 유형의 파일은 동일한 디렉토리에 위치시킵니다.
- 테스트 파일은 `__tests__` 디렉토리에 원본과 유사한 구조로 배치합니다.

## 🚀 사용 방법 (Usage)

### 데이터 업데이트
HTML 파일(`career-table.html`, `special-thanks.html`)의 내용을 수정한 후, 다음 명령어로 CSV 데이터를 갱신할 수 있습니다.

```bash
node scripts/extract.js
```

### 테스트 실행
유틸리티 스크립트의 무결성을 검증하기 위해 테스트를 실행합니다.

```bash
npm test
# 또는
node --test __tests__/
```
