/**
 * 메인 스크립트
 * 서비스 워커 등록 및 공통 로직 처리
 */

// 서비스 워커 등록 (PWA 및 캐싱 지원)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 현재 페이지 위치에 따라 sw.js 경로 조정
    const path = window.location.pathname;
    let swPath = './sw.js';
    
    // posts 또는 pages 디렉토리 등 하위 경로에 있는 경우
    if (path.includes('/posts/') || path.includes('\\posts\\') || path.includes('/pages/') || path.includes('\\pages\\')) {
        swPath = '../sw.js';
    }

    navigator.serviceWorker.register(swPath)
      .then(registration => {
        console.log('ServiceWorker 등록 성공:', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker 등록 실패:', err);
      });
  });
}

// 페이지 로드 성능 측정
window.addEventListener('load', () => {
    // Navigation Timing API 레거시 지원
    const perfData = window.performance.timing;
    const loadTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
    
    if (loadTime > 0) {
        console.log(`페이지 로드 시간: ${loadTime}ms`);
    }
});

// 프로필 링크 업데이트 (index.html 등에서 사용)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof SITE_DATA === 'undefined') return;

    // Discord 링크 업데이트
    if (SITE_DATA.DISCORD_ID) {
        // discord:// 스키마를 사용하는 모든 링크 찾기
        const discordLinks = document.querySelectorAll('a[href^="discord://"]');
        discordLinks.forEach(link => {
            link.href = `discord://-/users/${SITE_DATA.DISCORD_ID}`;
        });
    }

    // GitHub 링크 업데이트
    if (SITE_DATA.SOCIAL && SITE_DATA.SOCIAL.GITHUB) {
        // 정확히 GitHub 프로필을 가리키는 링크 찾기 (CSS 선택자가 좀 더 안전할 수 있음)
        // 여기서는 기존 href가 GitHub URL을 포함하거나, 특정 클래스를 가진 경우를 찾습니다.
        const githubLinks = document.querySelectorAll('a[href*="github.com/ShinHaneul-39"]');
        githubLinks.forEach(link => {
            link.href = SITE_DATA.SOCIAL.GITHUB;
        });
    }
});
