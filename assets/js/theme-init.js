/**
 * @fileoverview 테마 초기화 스크립트 (Flash of Incorrect Theme 방지)
 * 
 * 페이지 로딩 직후(렌더링 전)에 실행되어야 하는 스크립트입니다.
 * 사용자의 이전 설정(LocalStorage) 또는 시스템 설정(prefers-color-scheme)을 확인하여
 * 최상위 요소(html)에 'dark-mode' 클래스를 즉시 적용합니다.
 * 이를 통해 페이지 로드 시 테마가 깜빡이는 현상(FOUC)을 방지합니다.
 */

(function() {
  // 1. 로컬 스토리지 확인
  // 사용자가 이전에 명시적으로 설정한 테마가 있는지 확인합니다.
  const savedTheme = localStorage.getItem('theme');
  
  // 2. 시스템 선호도 확인
  // OS 또는 브라우저 수준에서 다크 모드를 선호하는지 확인합니다.
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // 3. 테마 적용 로직
  // 저장된 테마가 'dark'이거나, 저장된 설정이 없는데 시스템이 다크 모드인 경우
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    // 다크 모드 활성화 (CSS 변수 적용을 위한 클래스 추가)
    document.documentElement.classList.add('dark-mode');
  } else {
    // 라이트 모드 (클래스 제거)
    document.documentElement.classList.remove('dark-mode');
  }
})();
